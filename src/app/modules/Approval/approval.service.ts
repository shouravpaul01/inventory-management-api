import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import {
  ApprovalRequirement,
  ApprovalScope,
  ApprovalStatus,
  ApprovalDecision,
  ApprovalEntityType,
} from "@prisma/client";
import { generateSequentialCode } from "../../../helpers/sequenceGenerator";
import { IAuthUser } from "../../../interfaces";
import QueryBuilder from "../../../helpers/queryBuilder";
import {
  IApprovalCheckResult,
  ICreateApprovalRequestParams,
  IProcessApprovalDecisionPayload,
  ICreatePolicyPayload,
  IUpdatePolicyPayload,
} from "./approval.interface";
import { evaluateCondition, ApprovalUtils } from "./approval.utils";

export { IApprovalCheckResult };

// ─── REUSABLE APPROVAL ENGINE CHECK ──────────────────────────────────────────

const checkApprovalRequirement = async (params: {
  permissionCode: string;
  user: IAuthUser;
  payload?: Record<string, any>;
}): Promise<IApprovalCheckResult> => {
  const { permissionCode, user, payload = {} } = params;

  // 1. Explicit Approval Bypass check
  if (user.permissions?.includes("approval.bypass")) {
    return {
      required: false,
      bypassed: true,
      reason: "Bypassed via explicit approval.bypass permission",
    };
  }

  // 2. Find permission
  const permission = await prisma.permission.findUnique({
    where: { code: permissionCode },
  });

  if (!permission) {
    // If not a registered permission, default to no approval required
    return { required: false };
  }

  // Fetch all active policies for this permission
  const policies = await prisma.approvalPolicy.findMany({
    where: {
      permissionId: permission.id,
      isActive: true,
    },
  });

  if (policies.length === 0) {
    return { required: false };
  }

  // Fetch role IDs assigned to this user
  const userRoleRecords = await prisma.userRole.findMany({
    where: { userId: user.id },
    select: { roleId: true },
  });
  const userRoleIds = new Set(userRoleRecords.map((ur) => ur.roleId));

  // PRIORITY 1: User-specific policy
  const userPolicy = policies.find(
    (p) => p.scope === ApprovalScope.USER && p.userId === user.id
  );

  if (userPolicy) {
    const conditionMatches = evaluateCondition(userPolicy.condition, payload);
    if (conditionMatches) {
      return {
        required: userPolicy.requirement === ApprovalRequirement.REQUIRED,
        policy: userPolicy,
        reason: `Matched USER policy: requirement is ${userPolicy.requirement}`,
      };
    }
  }

  // PRIORITY 2: Role-specific policy
  const rolePolicy = policies.find(
    (p) => p.scope === ApprovalScope.ROLE && p.roleId && userRoleIds.has(p.roleId)
  );

  if (rolePolicy) {
    const conditionMatches = evaluateCondition(rolePolicy.condition, payload);
    if (conditionMatches) {
      return {
        required: rolePolicy.requirement === ApprovalRequirement.REQUIRED,
        policy: rolePolicy,
        reason: `Matched ROLE policy: requirement is ${rolePolicy.requirement}`,
      };
    }
  }

  // PRIORITY 3: System-wide policy
  const systemPolicy = policies.find((p) => p.scope === ApprovalScope.SYSTEM);

  if (systemPolicy) {
    const conditionMatches = evaluateCondition(systemPolicy.condition, payload);
    if (conditionMatches) {
      return {
        required: systemPolicy.requirement === ApprovalRequirement.REQUIRED,
        policy: systemPolicy,
        reason: `Matched SYSTEM policy: requirement is ${systemPolicy.requirement}`,
      };
    }
  }

  // DEFAULT: If no matching policy condition triggered
  return { required: false };
};

// ─── CREATE APPROVAL REQUEST ─────────────────────────────────────────────────

const createApprovalRequest = async (params: ICreateApprovalRequestParams) => {
  const {
    entityType,
    entityId,
    permissionCode,
    requestedBy,
    policy,
    reason,
    metadata,
  } = params;

  const totalLevels = policy.approvalLevelCount || 1;
  const requestNumber = await generateSequentialCode("APP_SEQ", "APP");

  // Create approval request with pending records for each level
  const request = await prisma.approvalRequest.create({
    data: {
      requestNumber,
      entityType,
      entityId,
      permissionCode,
      requestedById: requestedBy.id,
      status: ApprovalStatus.PENDING,
      currentLevel: 1,
      totalLevels,
      reason,
      metadata: metadata || {},
      records: {
        create: Array.from({ length: totalLevels }, (_, idx) => ({
          level: idx + 1,
          status: idx === 0 ? ApprovalStatus.PENDING : ApprovalStatus.PENDING,
        })),
      },
    },
    include: {
      records: true,
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeId: true,
        },
      },
    },
  });

  // Audit log for approval request creation
  await prisma.auditLog.create({
    data: {
      actorId: requestedBy.id,
      action: "CREATE",
      module: "Approval",
      entityType: "ApprovalRequest",
      entityId: request.id,
      approvalRequired: true,
      approvalRequestId: request.id,
      metadata: { requestNumber, permissionCode, totalLevels },
    },
  });

  return request;
};

// ─── ACTION (APPROVE / REJECT) AN APPROVAL REQUEST ───────────────────────────

const actionApprovalRequest = async (
  requestId: string,
  user: IAuthUser,
  payload: IProcessApprovalDecisionPayload
) => {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: {
      records: {
        orderBy: { level: "asc" },
      },
      requestedBy: true,
    },
  });

  if (!request) {
    throw new ApiError(httpStatus.NOT_FOUND, "Approval request not found!");
  }

  if (request.status !== ApprovalStatus.PENDING) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot act on request that is already ${request.status}!`
    );
  }

  // Find corresponding policy to verify allowSelfApproval
  const permission = await prisma.permission.findUnique({
    where: { code: request.permissionCode },
  });

  if (permission) {
    const policy = await prisma.approvalPolicy.findFirst({
      where: {
        permissionId: permission.id,
        isActive: true,
      },
    });

    if (policy && !policy.allowSelfApproval && request.requestedById === user.id) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "Self-approval is not permitted for this action policy!"
      );
    }
  }

  const currentRecord = request.records.find((r) => r.level === request.currentLevel);

  if (!currentRecord) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Current approval level record not found!");
  }

  const decisionMapped: ApprovalDecision =
    payload.decision === "APPROVE"
      ? ApprovalDecision.APPROVED
      : payload.decision === "REJECT"
      ? ApprovalDecision.REJECTED
      : ApprovalDecision.RETURN_FOR_CORRECTION;

  const now = new Date();

  if (payload.decision === "REJECT") {
    // 1. Update current record
    await prisma.approvalRecord.update({
      where: { id: currentRecord.id },
      data: {
        approverId: user.id,
        decision: decisionMapped,
        status: ApprovalStatus.REJECTED,
        comments: payload.comments,
        actedAt: now,
      },
    });

    // 2. Reject overall request
    const updatedRequest = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.REJECTED,
      },
      include: {
        records: true,
        requestedBy: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "REJECT",
        module: "Approval",
        entityType: "ApprovalRequest",
        entityId: requestId,
        approvalRequestId: requestId,
        metadata: { comments: payload.comments, level: request.currentLevel },
      },
    });

    return updatedRequest;
  }

  if (payload.decision === "APPROVE") {
    // 1. Update current record to APPROVED
    await prisma.approvalRecord.update({
      where: { id: currentRecord.id },
      data: {
        approverId: user.id,
        decision: decisionMapped,
        status: ApprovalStatus.APPROVED,
        comments: payload.comments,
        actedAt: now,
      },
    });

    const isFinalLevel = request.currentLevel >= request.totalLevels;

    // 2. Either progress to next level or mark request APPROVED
    const updatedRequest = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: isFinalLevel ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
        currentLevel: isFinalLevel ? request.currentLevel : request.currentLevel + 1,
      },
      include: {
        records: true,
        requestedBy: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "APPROVE",
        module: "Approval",
        entityType: "ApprovalRequest",
        entityId: requestId,
        approvalRequestId: requestId,
        metadata: {
          comments: payload.comments,
          level: request.currentLevel,
          isFinal: isFinalLevel,
        },
      },
    });

    return updatedRequest;
  }

  // REQUEST_CHANGE
  await prisma.approvalRecord.update({
    where: { id: currentRecord.id },
    data: {
      approverId: user.id,
      decision: decisionMapped,
      comments: payload.comments,
      actedAt: now,
    },
  });

  return getApprovalRequestById(requestId);
};

// ─── QUERY REQUESTS ──────────────────────────────────────────────────────────

const getAllApprovalRequests = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.approvalRequest as any, query, {
    fields: {
      requestNumber: { type: "string", searchable: true, sortable: true, filterable: true },
      entityType: { type: "string", sortable: true, filterable: true },
      entityId: { type: "string", filterable: true },
      permissionCode: { type: "string", searchable: true, sortable: true, filterable: true },
      status: { type: "string", sortable: true, filterable: true },
      requestedById: { type: "string", filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["requestNumber", "permissionCode", "reason"])
    .filter()
    .sort()
    .paginate()
    .include({
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeId: true,
        },
      },
      records: {
        include: {
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const getApprovalRequestById = async (id: string) => {
  const request = await prisma.approvalRequest.findUnique({
    where: { id },
    include: {
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeId: true,
        },
      },
      records: {
        include: {
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { level: "asc" },
      },
    },
  });

  if (!request) {
    throw new ApiError(httpStatus.NOT_FOUND, "Approval request not found!");
  }

  return request;
};

// ─── POLICY CRUD ─────────────────────────────────────────────────────────────

const createPolicy = async (
  payload: ICreatePolicyPayload,
  creatorId?: string
) => {
  const permission = await prisma.permission.findUnique({
    where: { code: payload.permissionCode },
  });

  if (!permission) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Permission code '${payload.permissionCode}' does not exist!`
    );
  }

  if (payload.scope === "ROLE" && !payload.roleId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "roleId is required for ROLE scope policy!");
  }

  if (payload.scope === "USER" && !payload.userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "userId is required for USER scope policy!");
  }

  const policy = await prisma.approvalPolicy.create({
    data: {
      permissionId: permission.id,
      requirement: (payload.requirement as ApprovalRequirement) || ApprovalRequirement.REQUIRED,
      scope: (payload.scope as ApprovalScope) || ApprovalScope.SYSTEM,
      roleId: payload.roleId,
      userId: payload.userId,
      condition: payload.condition || null,
      approvalLevelCount: payload.approvalLevelCount || 1,
      allowSelfApproval: payload.allowSelfApproval ?? false,
      createdById: creatorId,
      isActive: true,
    },
    include: {
      permission: true,
    },
  });

  return policy;
};

const getAllPolicies = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.approvalPolicy as any, query, {
    fields: {
      scope: { type: "string", sortable: true, filterable: true },
      requirement: { type: "string", sortable: true, filterable: true },
      permissionId: { type: "string", filterable: true },
      roleId: { type: "string", filterable: true },
      userId: { type: "string", filterable: true },
      isActive: { type: "boolean", sortable: true, filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .filter()
    .sort()
    .paginate()
    .include({
      permission: true,
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const getPolicyById = async (id: string) => {
  const policy = await prisma.approvalPolicy.findUnique({
    where: { id },
    include: {
      permission: true,
    },
  });

  if (!policy) {
    throw new ApiError(httpStatus.NOT_FOUND, "Approval policy not found!");
  }

  return policy;
};

const updatePolicy = async (
  id: string,
  payload: IUpdatePolicyPayload
) => {
  await getPolicyById(id);

  const updated = await prisma.approvalPolicy.update({
    where: { id },
    data: payload as any,
    include: {
      permission: true,
    },
  });

  return updated;
};

const deletePolicy = async (id: string) => {
  await getPolicyById(id);

  await prisma.approvalPolicy.delete({
    where: { id },
  });

  return { message: "Approval policy deleted successfully!" };
};

export const ApprovalService = {
  checkApprovalRequirement,
  createApprovalRequest,
  actionApprovalRequest,
  getAllApprovalRequests,
  getApprovalRequestById,
  createPolicy,
  getAllPolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy,
};
