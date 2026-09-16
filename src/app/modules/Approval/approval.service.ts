import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import {
  ApprovalRequirement,
  ApprovalScope,
  ApprovalStatus,
  ApprovalDecision,
  ApprovalEntityType,
  AuditAction,
  RequestStatus,
} from "@prisma/client";
import { generateSequentialCode } from "../../../helpers/sequenceGenerator";
import { IAuthUser } from "../../../interfaces";
import QueryBuilder from "../../../helpers/queryBuilder";
import {
  IApprovalCheckResult,
  ICreateApprovalRequestParams,
  IProcessApprovalDecisionPayload,
  IResubmitApprovalRequestPayload,
  ICreatePolicyPayload,
  IUpdatePolicyPayload,
} from "./approval.interface";
import { evaluateCondition } from "./approval.evaluator";
import { NotificationService } from "../Notification/notification.service";
import { AuditService } from "../Audit/audit.service";
import { ApprovalExecutionService } from "./approval.execution.service";

export { IApprovalCheckResult };

/**
 * Check if a permission is a mutation (Create/Update/Delete/Adjust/Submit/etc.)
 */
const isMutationPermission = (code: string): boolean => {
  if (code.endsWith(".view") || code.endsWith(".qr_lookup")) return false;
  return (
    code.includes(".create") ||
    code.includes(".update") ||
    code.includes(".delete") ||
    code.includes(".adjust") ||
    code.includes(".transfer") ||
    code.includes(".in") ||
    code.includes(".out") ||
    code.includes(".submit") ||
    code.includes(".status") ||
    code.includes(".process") ||
    code.includes(".confirm")
  );
};

// ─── REUSABLE APPROVAL ENGINE CHECK ──────────────────────────────────────────

const checkApprovalRequirement = async (params: {
  permissionCode: string;
  user: IAuthUser;
  payload?: Record<string, any>;
}): Promise<IApprovalCheckResult> => {
  const { permissionCode, user, payload = {} } = params;

  // 1. Super Admin is ALWAYS exempted from approval requirements
  if (user.isSuperAdmin) {
    return {
      required: false,
      bypassed: true,
      reason: "Super Admin actions are automatically approved without review",
    };
  }

  // 2. Explicit Approval Bypass check
  if (user.permissions?.includes("approval.bypass")) {
    return {
      required: false,
      bypassed: true,
      reason: "Bypassed via explicit approval.bypass permission",
    };
  }

  // 3. Read/View permissions never require approval
  if (permissionCode.endsWith(".view") || permissionCode.endsWith(".qr_lookup")) {
    return { required: false };
  }

  // 4. Find permission in DB
  const permission = await prisma.permission.findUnique({
    where: { code: permissionCode },
  });

  if (!permission) {
    return { required: false };
  }

  // Fetch all active policies for this permission
  const policies = await prisma.approvalPolicy.findMany({
    where: {
      permissionId: permission.id,
      isActive: true,
    },
  });

  // Fetch role IDs assigned to this user
  const userRoleRecords = await prisma.userRole.findMany({
    where: { userId: user.id },
    select: { roleId: true },
  });
  const userRoleIds = new Set(userRoleRecords.map((ur) => ur.roleId));

  // PRIORITY 1: User-specific policy (Super Admin explicitly exempted or required for this user)
  const userPolicy = policies.find(
    (p) => p.scope === ApprovalScope.USER && p.userId === user.id
  );

  if (userPolicy) {
    const conditionMatches = evaluateCondition(userPolicy.condition, payload);
    if (conditionMatches) {
      const isReq = userPolicy.requirement === ApprovalRequirement.REQUIRED;
      return {
        required: isReq,
        bypassed: !isReq,
        policy: userPolicy,
        reason: isReq
          ? "Approval required via explicit USER policy"
          : "Exempted from approval via Super Admin USER policy",
      };
    }
  }

  // PRIORITY 2: Role-specific policy (Super Admin exempted or required for this role)
  const rolePolicy = policies.find(
    (p) => p.scope === ApprovalScope.ROLE && p.roleId && userRoleIds.has(p.roleId)
  );

  if (rolePolicy) {
    const conditionMatches = evaluateCondition(rolePolicy.condition, payload);
    if (conditionMatches) {
      const isReq = rolePolicy.requirement === ApprovalRequirement.REQUIRED;
      return {
        required: isReq,
        bypassed: !isReq,
        policy: rolePolicy,
        reason: isReq
          ? "Approval required via ROLE policy"
          : "Exempted from approval via Super Admin ROLE policy",
      };
    }
  }

  // PRIORITY 3: System-wide action policy (Super Admin exempted or required for this action)
  const systemPolicy = policies.find((p) => p.scope === ApprovalScope.SYSTEM);

  if (systemPolicy) {
    const conditionMatches = evaluateCondition(systemPolicy.condition, payload);
    if (conditionMatches) {
      const isReq = systemPolicy.requirement === ApprovalRequirement.REQUIRED;
      return {
        required: isReq,
        bypassed: !isReq,
        policy: systemPolicy,
        reason: isReq
          ? "Approval required via SYSTEM action policy"
          : "Exempted from approval via Super Admin SYSTEM policy",
      };
    }
  }

  // PRIORITY 4: Institutional Default Rule (Maker-Checker by default for all mutations)
  // "je kew entry dik super admin approval lagve" -> All mutations require Super Admin approval by default
  if (isMutationPermission(permissionCode)) {
    return {
      required: true,
      reason: "System default: All create/update/mutation entries require Super Admin approval unless explicitly exempted",
    };
  }

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

  const totalLevels = policy?.approvalLevelCount || 1;
  const requestNumber = await generateSequentialCode("APP_SEQ", "APP");

  // Create approval request with pending records for each level
  const request = await prisma.approvalRequest.create({
    data: {
      requestNumber,
      entityType,
      entityId: entityId || "PENDING_CREATION",
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
          status: ApprovalStatus.PENDING,
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
  await AuditService.logCreate({
    module: "Approval",
    entityType: "ApprovalRequest",
    entityId: request.id,
    actorId: requestedBy.id,
    approvalRequired: true,
    approvalRequestId: request.id,
    metadata: { requestNumber, permissionCode, totalLevels },
  });

  // Real-time Notification for requester
  await NotificationService.createNotification({
    userId: requestedBy.id,
    type: "APPROVAL",
    title: "Approval Request Submitted",
    message: `Approval request '${requestNumber}' for ${entityType} has been submitted for Super Admin review.`,
    referenceType: "ApprovalRequest",
    referenceId: request.id,
  });

  // Real-time Notification for Super Admin
  await NotificationService.notifyRole({
    roleCode: "SUPER_ADMIN",
    type: "APPROVAL",
    title: "New Approval Required",
    message: `New approval request '${requestNumber}' for ${entityType} submitted by ${requestedBy.firstName} ${requestedBy.lastName || ""}.`,
    referenceType: "ApprovalRequest",
    referenceId: request.id,
  });

  return request;
};

// ─── ACTION (APPROVE / REJECT / REQUEST_CHANGE) AN APPROVAL REQUEST ───────────

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

  if (request.status !== ApprovalStatus.PENDING && request.status !== ApprovalStatus.RETURN_FOR_CORRECTION) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot act on request that is already ${request.status}!`
    );
  }

  // Self-approval restriction (unless Super Admin)
  if (!user.isSuperAdmin && request.requestedById === user.id) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Self-approval is strictly forbidden! You cannot review your own submission."
    );
  }

  // Validate mandatory feedback on rejection or return
  if (
    (payload.decision === "REJECT" || payload.decision === "REQUEST_CHANGE") &&
    (!payload.comments || payload.comments.trim().length < 5)
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Mandatory feedback of at least 5 characters is required when rejecting or requesting changes."
    );
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

  // ════════════════════════════════════════════════════════════
  // 1. REJECT DECISION
  // ════════════════════════════════════════════════════════════
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
    const existingMeta = (request.metadata || {}) as Record<string, any>;
    const updatedRequest = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.REJECTED,
        metadata: {
          ...existingMeta,
          rejectionFeedback: payload.comments,
          rejectedAt: now.toISOString(),
          rejectedBy: {
            id: user.id,
            name: `${user.firstName} ${user.lastName || ""}`.trim(),
          },
        },
      },
      include: {
        records: true,
        requestedBy: true,
      },
    });

    // 3. If Requisition, update requisition status to REJECTED with remarks
    if (request.entityType === ApprovalEntityType.REQUISITION && request.entityId) {
      await prisma.requisition.update({
        where: { id: request.entityId },
        data: {
          status: RequestStatus.REJECTED,
          remarks: payload.comments,
        },
      });
    }

    // Audit log
    await AuditService.logAction(AuditAction.REJECT, {
      module: "Approval",
      entityType: "ApprovalRequest",
      entityId: requestId,
      actorId: user.id,
      approvalRequestId: requestId,
      metadata: { comments: payload.comments, level: request.currentLevel },
    });

    // Real-time Notification to requester with feedback
    await NotificationService.createNotification({
      userId: request.requestedById,
      type: "APPROVAL",
      title: "Approval Request Rejected",
      message: `Your request '${request.requestNumber}' for ${request.entityType} was REJECTED by Super Admin. Feedback: "${payload.comments}". You can review, fix, and resubmit.`,
      referenceType: "ApprovalRequest",
      referenceId: request.id,
    });

    return updatedRequest;
  }

  // ════════════════════════════════════════════════════════════
  // 2. RETURN FOR CORRECTION / REQUEST_CHANGE DECISION
  // ════════════════════════════════════════════════════════════
  if (payload.decision === "REQUEST_CHANGE") {
    // 1. Update current record
    await prisma.approvalRecord.update({
      where: { id: currentRecord.id },
      data: {
        approverId: user.id,
        decision: decisionMapped,
        status: ApprovalStatus.RETURN_FOR_CORRECTION,
        comments: payload.comments,
        actedAt: now,
      },
    });

    // 2. Update overall request status to RETURN_FOR_CORRECTION
    const existingMeta = (request.metadata || {}) as Record<string, any>;
    const updatedRequest = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.RETURN_FOR_CORRECTION,
        metadata: {
          ...existingMeta,
          correctionFeedback: payload.comments,
          returnedAt: now.toISOString(),
          returnedBy: {
            id: user.id,
            name: `${user.firstName} ${user.lastName || ""}`.trim(),
          },
        },
      },
      include: {
        records: true,
        requestedBy: true,
      },
    });

    // 3. If Requisition, allow editing by moving back to DRAFT or UNDER_REVIEW with remarks
    if (request.entityType === ApprovalEntityType.REQUISITION && request.entityId) {
      await prisma.requisition.update({
        where: { id: request.entityId },
        data: {
          status: RequestStatus.DRAFT,
          remarks: `Correction requested: ${payload.comments}`,
        },
      });
    }

    // Real-time Notification to requester with feedback
    await NotificationService.createNotification({
      userId: request.requestedById,
      type: "APPROVAL",
      title: "Correction Requested by Super Admin",
      message: `Your request '${request.requestNumber}' was returned for correction. Notes: "${payload.comments}". Please fix and resubmit.`,
      referenceType: "ApprovalRequest",
      referenceId: request.id,
    });

    return updatedRequest;
  }

  // ════════════════════════════════════════════════════════════
  // 3. APPROVE DECISION
  // ════════════════════════════════════════════════════════════
  if (payload.decision === "APPROVE") {
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

    // IF FINAL LEVEL: Execute the staged changes in database!
    let executionResult: any = null;
    if (isFinalLevel) {
      executionResult = await ApprovalExecutionService.executeApprovedRequest(request);
    }

    const existingMeta = (request.metadata || {}) as Record<string, any>;
    const updatedRequest = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: isFinalLevel ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
        currentLevel: isFinalLevel ? request.currentLevel : request.currentLevel + 1,
        metadata: {
          ...existingMeta,
          approvalComments: payload.comments,
          approvedAt: now.toISOString(),
          approvedBy: {
            id: user.id,
            name: `${user.firstName} ${user.lastName || ""}`.trim(),
          },
          executionResult: executionResult || undefined,
        },
      },
      include: {
        records: true,
        requestedBy: true,
      },
    });

    // Audit log
    await AuditService.logAction(AuditAction.APPROVE, {
      module: "Approval",
      entityType: "ApprovalRequest",
      entityId: requestId,
      actorId: user.id,
      approvalRequestId: requestId,
      metadata: {
        comments: payload.comments,
        level: request.currentLevel,
        isFinal: isFinalLevel,
      },
    });

    // Real-time Notification on approval progression
    if (isFinalLevel) {
      await NotificationService.createNotification({
        userId: request.requestedById,
        type: "APPROVAL",
        title: "Approval Request APPROVED",
        message: `Approval request '${request.requestNumber}' for ${request.entityType} has been APPROVED and executed by Super Admin!`,
        referenceType: "ApprovalRequest",
        referenceId: request.id,
      });
    } else {
      await NotificationService.createNotification({
        userId: request.requestedById,
        type: "APPROVAL",
        title: "Approval Advanced",
        message: `Approval request '${request.requestNumber}' approved at Level ${request.currentLevel} and advanced to Level ${request.currentLevel + 1}.`,
        referenceType: "ApprovalRequest",
        referenceId: request.id,
      });
    }

    return updatedRequest;
  }

  return getApprovalRequestById(requestId);
};

// ─── RESUBMIT / REVISE AN APPROVAL REQUEST ────────────────────────────────────

const resubmitApprovalRequest = async (
  requestId: string,
  user: IAuthUser,
  payload: IResubmitApprovalRequestPayload
) => {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: { requestedBy: true, records: true },
  });

  if (!request) {
    throw new ApiError(httpStatus.NOT_FOUND, "Approval request not found!");
  }

  // Only the original requester or Super Admin can resubmit
  if (!user.isSuperAdmin && request.requestedById !== user.id) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You can only resubmit your own approval requests!"
    );
  }

  // Request must be in REJECTED, RETURN_FOR_CORRECTION, or PENDING state
  if (request.status === ApprovalStatus.APPROVED || request.status === ApprovalStatus.CANCELLED) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot resubmit request that is already ${request.status}!`
    );
  }

  const existingMeta = (request.metadata || {}) as Record<string, any>;
  const revisions = existingMeta.revisionHistory || [];

  revisions.push({
    revisedAt: new Date().toISOString(),
    revisedBy: user.id,
    previousPayload: existingMeta.payload,
    resubmitReason: payload.resubmitReason || "Addressed reviewer feedback",
  });

  // Update metadata with the corrected payload
  const updatedMeta = {
    ...existingMeta,
    payload: {
      ...(existingMeta.payload || {}),
      ...payload.updatedPayload,
    },
    revisionHistory: revisions,
    resubmittedAt: new Date().toISOString(),
    lastResubmitReason: payload.resubmitReason || "Corrected and resubmitted",
  };

  // Reset status to PENDING
  const updatedRequest = await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: ApprovalStatus.PENDING,
      metadata: updatedMeta,
      currentLevel: 1,
    },
    include: {
      records: true,
      requestedBy: true,
    },
  });

  // If Requisition, ensure status is UNDER_REVIEW
  if (request.entityType === ApprovalEntityType.REQUISITION && request.entityId) {
    await prisma.requisition.update({
      where: { id: request.entityId },
      data: {
        status: RequestStatus.UNDER_REVIEW,
        remarks: payload.resubmitReason || "Resubmitted with corrections",
      },
    });
  }

  // Notify Super Admin
  await NotificationService.notifyRole({
    roleCode: "SUPER_ADMIN",
    type: "APPROVAL",
    title: "Revised Request Resubmitted",
    message: `Request '${request.requestNumber}' for ${request.entityType} was revised and resubmitted by ${user.firstName} ${user.lastName || ""} for review.`,
    referenceType: "ApprovalRequest",
    referenceId: request.id,
  });

  return updatedRequest;
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
      reason: { type: "string", searchable: true, filterable: true },
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

// ─── POLICY CRUD & EXEMPTION MANAGEMENT ─────────────────────────────────────

const createPolicy = async (
  payload: ICreatePolicyPayload,
  creatorId?: string
) => {
  const permissionCodes =
    payload.permissionCodes && payload.permissionCodes.length > 0
      ? payload.permissionCodes
      : payload.permissionCode
      ? [payload.permissionCode]
      : [];

  if (permissionCodes.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "At least one permission code is required!"
    );
  }

  if (payload.scope === "ROLE" && !payload.roleId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "roleId is required for ROLE scope policy!");
  }

  if (payload.scope === "USER" && !payload.userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "userId is required for USER scope policy!");
  }

  const permissions = await prisma.permission.findMany({
    where: {
      code: { in: permissionCodes },
    },
  });

  if (permissions.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "None of the specified permission codes exist!"
    );
  }

  const targetScope = (payload.scope as ApprovalScope) || ApprovalScope.USER;
  const createdPolicies = [];

  for (const permission of permissions) {
    const existing = await prisma.approvalPolicy.findFirst({
      where: {
        permissionId: permission.id,
        scope: targetScope,
        userId: payload.scope === "USER" ? payload.userId : undefined,
        roleId: payload.scope === "ROLE" ? payload.roleId : undefined,
      },
    });

    if (existing) {
      const updated = await prisma.approvalPolicy.update({
        where: { id: existing.id },
        data: {
          requirement: (payload.requirement as ApprovalRequirement) || ApprovalRequirement.REQUIRED,
          condition: payload.condition !== undefined ? payload.condition : existing.condition,
          approvalLevelCount: payload.approvalLevelCount || existing.approvalLevelCount,
          allowSelfApproval: payload.allowSelfApproval ?? existing.allowSelfApproval,
          isActive: true,
        },
        include: {
          permission: true,
        },
      });
      createdPolicies.push(updated);
    } else {
      const created = await prisma.approvalPolicy.create({
        data: {
          permissionId: permission.id,
          requirement: (payload.requirement as ApprovalRequirement) || ApprovalRequirement.REQUIRED,
          scope: targetScope,
          roleId: payload.scope === "ROLE" ? payload.roleId : undefined,
          userId: payload.scope === "USER" ? payload.userId : undefined,
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
      createdPolicies.push(created);
    }
  }

  return createdPolicies.length === 1 ? createdPolicies[0] : createdPolicies;
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

  const data: any[] = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  // Populate user and role information for UI display
  const userIds = data.map((p) => p.userId).filter(Boolean);
  const roleIds = data.map((p) => p.roleId).filter(Boolean);

  const [users, roles] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true, email: true, employeeId: true },
        })
      : [],
    roleIds.length > 0
      ? prisma.role.findMany({
          where: { id: { in: roleIds } },
          select: { id: true, name: true, code: true },
        })
      : [],
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const roleMap = new Map(roles.map((r) => [r.id, r]));

  const enrichedData = data.map((p) => ({
    ...p,
    user: p.userId ? userMap.get(p.userId) || null : null,
    role: p.roleId ? roleMap.get(p.roleId) || null : null,
  }));

  return { meta, data: enrichedData };
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

  let user = null;
  if (policy.userId) {
    user = await prisma.user.findUnique({
      where: { id: policy.userId },
      select: { id: true, firstName: true, lastName: true, email: true, employeeId: true },
    });
  }

  let role = null;
  if (policy.roleId) {
    role = await prisma.role.findUnique({
      where: { id: policy.roleId },
      select: { id: true, name: true, code: true },
    });
  }

  return { ...policy, user, role };
};

const updatePolicy = async (
  id: string,
  payload: IUpdatePolicyPayload
) => {
  const existingPolicy = await getPolicyById(id);

  const updateData: Record<string, any> = { ...payload };

  // If changing scope, sanitize conflicting target
  if (payload.scope === "USER") {
    updateData.roleId = null;
  } else if (payload.scope === "ROLE") {
    updateData.userId = null;
  }

  // If NOT_REQUIRED, reset levels to 1 and self-approval to false
  if (payload.requirement === "NOT_REQUIRED") {
    updateData.approvalLevelCount = 1;
    updateData.allowSelfApproval = false;
  }

  const permissionCodes =
    payload.permissionCodes && payload.permissionCodes.length > 0
      ? payload.permissionCodes
      : payload.permissionCode
      ? [payload.permissionCode]
      : [];

  // Remove non-prisma fields from updateData
  delete updateData.permissionCodes;
  delete updateData.permissionCode;

  if (permissionCodes.length > 0) {
    const permissions = await prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
    });

    if (permissions.length > 0) {
      // Find permission that matches current policy, or pick first
      const matchingPerm = permissions.find((p) => p.id === existingPolicy.permissionId);
      const primaryPerm = matchingPerm || permissions[0];

      updateData.permissionId = primaryPerm.id;

      const updated = await prisma.approvalPolicy.update({
        where: { id },
        data: updateData,
        include: {
          permission: true,
        },
      });

      // For any other selected permissions, create or update policies for the same target
      const otherPerms = permissions.filter((p) => p.id !== primaryPerm.id);
      const targetScope = updated.scope;
      const targetRoleId = updated.scope === "ROLE" ? updated.roleId : null;
      const targetUserId = updated.scope === "USER" ? updated.userId : null;

      for (const otherPerm of otherPerms) {
        const otherExisting = await prisma.approvalPolicy.findFirst({
          where: {
            permissionId: otherPerm.id,
            scope: targetScope,
            roleId: targetRoleId,
            userId: targetUserId,
          },
        });

        if (otherExisting) {
          await prisma.approvalPolicy.update({
            where: { id: otherExisting.id },
            data: {
              requirement: updated.requirement,
              condition: updated.condition,
              approvalLevelCount: updated.approvalLevelCount,
              allowSelfApproval: updated.allowSelfApproval,
              isActive: updated.isActive,
            },
          });
        } else {
          await prisma.approvalPolicy.create({
            data: {
              permissionId: otherPerm.id,
              requirement: updated.requirement,
              scope: targetScope,
              roleId: targetRoleId || undefined,
              userId: targetUserId || undefined,
              condition: updated.condition,
              approvalLevelCount: updated.approvalLevelCount,
              allowSelfApproval: updated.allowSelfApproval,
              createdById: updated.createdById,
              isActive: updated.isActive,
            },
          });
        }
      }

      return updated;
    }
  }

  const updated = await prisma.approvalPolicy.update({
    where: { id },
    data: updateData,
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

// ─── EXEMPTION SUMMARY (SUPER ADMIN OVERVIEW) ────────────────────────────────

const getExemptionSummary = async () => {
  const activePolicies = await prisma.approvalPolicy.findMany({
    where: { isActive: true },
    include: { permission: true },
  });

  const userIds = activePolicies.map((p) => p.userId).filter(Boolean) as string[];
  const roleIds = activePolicies.map((p) => p.roleId).filter(Boolean) as string[];

  const [users, roles] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true, email: true, employeeId: true },
        })
      : [],
    roleIds.length > 0
      ? prisma.role.findMany({
          where: { id: { in: roleIds } },
          select: { id: true, name: true, code: true },
        })
      : [],
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const roleMap = new Map(roles.map((r) => [r.id, r]));

  const exemptedUsers = activePolicies
    .filter((p) => p.scope === ApprovalScope.USER && p.requirement === ApprovalRequirement.NOT_REQUIRED)
    .map((p) => ({
      policyId: p.id,
      permissionCode: p.permission.code,
      permissionName: p.permission.name,
      user: p.userId ? userMap.get(p.userId) : null,
    }));

  const exemptedRoles = activePolicies
    .filter((p) => p.scope === ApprovalScope.ROLE && p.requirement === ApprovalRequirement.NOT_REQUIRED)
    .map((p) => ({
      policyId: p.id,
      permissionCode: p.permission.code,
      permissionName: p.permission.name,
      role: p.roleId ? roleMap.get(p.roleId) : null,
    }));

  const exemptedActions = activePolicies
    .filter((p) => p.scope === ApprovalScope.SYSTEM && p.requirement === ApprovalRequirement.NOT_REQUIRED)
    .map((p) => ({
      policyId: p.id,
      permissionCode: p.permission.code,
      permissionName: p.permission.name,
    }));

  return {
    systemDefaultRule: "STRICT_APPROVAL_REQUIRED (All mutations require Super Admin approval by default)",
    superAdminStatus: "ALL_SUPER_ADMINS_AUTO_BYPASSED",
    exemptedUsersCount: exemptedUsers.length,
    exemptedRolesCount: exemptedRoles.length,
    exemptedActionsCount: exemptedActions.length,
    exemptedUsers,
    exemptedRoles,
    exemptedActions,
  };
};

export const ApprovalService = {
  checkApprovalRequirement,
  createApprovalRequest,
  actionApprovalRequest,
  resubmitApprovalRequest,
  getAllApprovalRequests,
  getApprovalRequestById,
  createPolicy,
  getAllPolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy,
  getExemptionSummary,
};
