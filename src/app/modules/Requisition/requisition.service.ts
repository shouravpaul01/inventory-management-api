import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../helpers/queryBuilder";
import { generateSequentialCode } from "../../../helpers/sequenceGenerator";
import { IAuthUser } from "../../../interfaces";
import {
  ApprovalEntityType,
  AuditAction,
  FulfillmentStatus,
  IssuePolicy,
  RequestLineStatus,
  RequestStatus,
  RequestType,
} from "@prisma/client";
import { ApprovalService } from "../Approval/approval.service";
import {
  ICreateRequisitionPayload,
  IUpdateRequisitionPayload,
  IReviewRequisitionPayload,
} from "./requisition.interface";
import { RequisitionUtils } from "./requisition.utils";
import { NotificationService } from "../Notification/notification.service";

// ════════════════════════════════════════════════════════════
// 1. CREATE DRAFT REQUISITION
// ════════════════════════════════════════════════════════════

const createRequisition = async (
  payload: ICreateRequisitionPayload,
  requester: IAuthUser
) => {
  // Validate department exists
  const dept = await prisma.department.findUnique({
    where: { id: payload.departmentId },
  });
  if (!dept) {
    throw new ApiError(httpStatus.NOT_FOUND, "Department not found!");
  }

  // Validate all items exist and are active
  const itemIds = payload.lines.map((l) => l.inventoryItemId);
  const items = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds } },
  });

  if (items.length !== itemIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, "One or more inventory items do not exist!");
  }

  const inactiveItem = items.find((i) => !i.isActive);
  if (inactiveItem) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Inventory item '${inactiveItem.name}' is inactive and cannot be requested!`
    );
  }

  // If requisition is marked temporary, verify all requested items are returnable
  if (payload.isTemporary) {
    RequisitionUtils.validateReturnableItems(items);
  }

  const requestNumber = await generateSequentialCode("REQ_SEQ", "REQ");

  const requisition = await prisma.requisition.create({
    data: {
      requestNumber,
      type: (payload.type as RequestType) || RequestType.REQUISITION,
      requesterId: requester.id,
      departmentId: dept.id,
      purpose: payload.purpose,
      remarks: payload.remarks,
      isTemporary: payload.isTemporary ?? false,
      requiredFrom: payload.requiredFrom,
      requiredUntil: payload.requiredUntil,
      status: RequestStatus.DRAFT,
      fulfillmentStatus: FulfillmentStatus.PENDING,
      lines: {
        create: payload.lines.map((line) => {
          const item = items.find((i) => i.id === line.inventoryItemId);
          return {
            inventoryItemId: line.inventoryItemId,
            requestedQty: line.requestedQty,
            approvedQty: 0,
            issuedQty: 0,
            returnedQty: 0,
            status: RequestLineStatus.PENDING,
            requestedIssuePolicy:
              (line.requestedIssuePolicy as IssuePolicy) ||
              item?.defaultIssuePolicy ||
              IssuePolicy.PERMANENT,
            remarks: line.remarks,
          };
        }),
      },
    },
    include: {
      lines: {
        include: {
          inventoryItem: true,
        },
      },
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          username: true,
          employeeId: true,
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: requester.id,
      action: AuditAction.CREATE,
      module: "Requisition",
      entityType: "Requisition",
      entityId: requisition.id,
      metadata: {
        requestNumber: requisition.requestNumber,
        departmentId: requisition.departmentId,
        lineCount: payload.lines.length,
      },
    },
  });

  return requisition;
};

// ════════════════════════════════════════════════════════════
// 2. UPDATE DRAFT REQUISITION
// ════════════════════════════════════════════════════════════

const updateRequisition = async (
  id: string,
  payload: IUpdateRequisitionPayload,
  user: IAuthUser
) => {
  const existing = await prisma.requisition.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Requisition not found!");
  }

  if (existing.status !== RequestStatus.DRAFT) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot modify requisition in '${existing.status}' status. Only DRAFT requisitions can be edited.`
    );
  }

  // Requester or admin with update permission
  if (existing.requesterId !== user.id && !user.permissions?.includes("requisition.update")) {
    throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to update this requisition.");
  }

  // Update lines if provided
  if (payload.lines && payload.lines.length > 0) {
    await prisma.requisitionLine.deleteMany({
      where: { requisitionId: existing.id },
    });

    const itemIds = payload.lines.map((l) => l.inventoryItemId);
    const items = await prisma.inventoryItem.findMany({
      where: { id: { in: itemIds } },
    });

    await prisma.requisitionLine.createMany({
      data: payload.lines.map((l) => {
        const item = items.find((i) => i.id === l.inventoryItemId);
        return {
          requisitionId: existing.id,
          inventoryItemId: l.inventoryItemId,
          requestedQty: l.requestedQty,
          approvedQty: 0,
          issuedQty: 0,
          returnedQty: 0,
          status: RequestLineStatus.PENDING,
          requestedIssuePolicy:
            (l.requestedIssuePolicy as IssuePolicy) ||
            item?.defaultIssuePolicy ||
            IssuePolicy.PERMANENT,
          remarks: l.remarks,
        };
      }),
    });
  }

  const updated = await prisma.requisition.update({
    where: { id },
    data: {
      purpose: payload.purpose ?? existing.purpose,
      remarks: payload.remarks ?? existing.remarks,
      isTemporary: payload.isTemporary ?? existing.isTemporary,
      requiredFrom: payload.requiredFrom ?? existing.requiredFrom,
      requiredUntil: payload.requiredUntil ?? existing.requiredUntil,
    },
    include: {
      lines: {
        include: {
          inventoryItem: true,
        },
      },
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          username: true,
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: AuditAction.UPDATE,
      module: "Requisition",
      entityType: "Requisition",
      entityId: id,
      metadata: { fieldsUpdated: Object.keys(payload) },
    },
  });

  return updated;
};

// ════════════════════════════════════════════════════════════
// 3. SUBMIT REQUISITION (INTEGRATES APPROVAL ENGINE)
// ════════════════════════════════════════════════════════════

const submitRequisition = async (id: string, user: IAuthUser) => {
  const requisition = await prisma.requisition.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!requisition) {
    throw new ApiError(httpStatus.NOT_FOUND, "Requisition not found!");
  }

  if (requisition.status !== RequestStatus.DRAFT) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot submit requisition in '${requisition.status}' status. Only DRAFT requisitions can be submitted.`
    );
  }

  if (requisition.lines.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Cannot submit an empty requisition without line items.");
  }

  // Check Approval Engine requirements
  const approvalCheck = await ApprovalService.checkApprovalRequirement({
    permissionCode: "requisition.submit",
    user,
    payload: {
      departmentId: requisition.departmentId,
      isTemporary: requisition.isTemporary,
      lineCount: requisition.lines.length,
      type: requisition.type,
    },
  });

  let newStatus: RequestStatus = RequestStatus.SUBMITTED;
  let approvalRequest = null;

  if (approvalCheck.required && approvalCheck.policy) {
    newStatus = RequestStatus.UNDER_REVIEW;
    approvalRequest = await ApprovalService.createApprovalRequest({
      entityType: ApprovalEntityType.REQUISITION,
      entityId: requisition.id,
      permissionCode: "requisition.submit",
      requestedBy: user,
      policy: approvalCheck.policy,
      reason: "Requisition submission approval workflow",
      metadata: {
        requestNumber: requisition.requestNumber,
        departmentId: requisition.departmentId,
        lineCount: requisition.lines.length,
      },
    });
  }

  const updatedRequisition = await prisma.requisition.update({
    where: { id: requisition.id },
    data: {
      status: newStatus,
      submittedAt: new Date(),
    },
    include: {
      lines: {
        include: {
          inventoryItem: true,
        },
      },
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: AuditAction.SUBMIT,
      module: "Requisition",
      entityType: "Requisition",
      entityId: requisition.id,
      metadata: {
        requestNumber: requisition.requestNumber,
        status: newStatus,
        approvalRequestId: approvalRequest?.id,
      },
    },
  });

  // Real-time Notification for requester
  await NotificationService.createNotification({
    userId: user.id,
    type: "REQUISITION",
    title: "Requisition Submitted",
    message: `Requisition '${requisition.requestNumber}' was submitted successfully.${approvalCheck.required ? " It is currently under review." : " It is ready for processing."}`,
    referenceType: "Requisition",
    referenceId: requisition.id,
  });

  // If no approval workflow was required, alert inventory managers
  if (!approvalCheck.required) {
    await NotificationService.notifyRole({
      roleCode: "INVENTORY_MANAGER",
      type: "REQUISITION",
      title: "New Requisition Ready",
      message: `Requisition '${requisition.requestNumber}' submitted and ready for distribution.`,
      referenceType: "Requisition",
      referenceId: requisition.id,
    });
  }

  return {
    requisition: updatedRequisition,
    approvalRequest,
    requiresApproval: approvalCheck.required,
  };
};

// ════════════════════════════════════════════════════════════
// 4. REVIEW REQUISITION (APPROVE / PARTIALLY APPROVE / REJECT)
// ════════════════════════════════════════════════════════════

const reviewRequisition = async (
  id: string,
  payload: IReviewRequisitionPayload,
  reviewer: IAuthUser
) => {
  const requisition = await prisma.requisition.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!requisition) {
    throw new ApiError(httpStatus.NOT_FOUND, "Requisition not found!");
  }

  if (
    requisition.status !== RequestStatus.SUBMITTED &&
    requisition.status !== RequestStatus.UNDER_REVIEW
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Requisition cannot be reviewed in current status: '${requisition.status}'.`
    );
  }

  // Prevent self-approval if reviewer is the requester
  if (requisition.requesterId === reviewer.id) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Self-approval is strictly forbidden. A different reviewer must approve your requisition."
    );
  }

  // Update line approvals
  for (const reviewLine of payload.lines) {
    const existingLine = requisition.lines.find((l) => l.id === reviewLine.lineId);
    if (!existingLine) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Line item ID '${reviewLine.lineId}' does not belong to this requisition!`
      );
    }

    if (reviewLine.approvedQty > existingLine.requestedQty) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Approved quantity (${reviewLine.approvedQty}) cannot exceed requested quantity (${existingLine.requestedQty}) for item line.`
      );
    }

    await prisma.requisitionLine.update({
      where: { id: reviewLine.lineId },
      data: {
        approvedQty: reviewLine.approvedQty,
        status: reviewLine.status as RequestLineStatus,
        remarks: reviewLine.remarks || existingLine.remarks,
      },
    });
  }

  // Determine final overall requisition status
  const updatedLines = await prisma.requisitionLine.findMany({
    where: { requisitionId: requisition.id },
  });

  const finalStatus = RequisitionUtils.calculateRequisitionReviewStatus(
    updatedLines,
    payload.decision
  );

  const updatedRequisition = await prisma.requisition.update({
    where: { id: requisition.id },
    data: {
      status: finalStatus,
      remarks: payload.comments
        ? `${requisition.remarks ? requisition.remarks + " | " : ""}Review comments: ${payload.comments}`
        : requisition.remarks,
    },
    include: {
      lines: {
        include: {
          inventoryItem: true,
        },
      },
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: reviewer.id,
      action: payload.decision === "REJECTED" ? AuditAction.REJECT : AuditAction.APPROVE,
      module: "Requisition",
      entityType: "Requisition",
      entityId: requisition.id,
      metadata: {
        requestNumber: requisition.requestNumber,
        decision: payload.decision,
        finalStatus,
        reviewerComments: payload.comments,
      },
    },
  });

  // Real-time Notification to requester on review outcome
  const reviewMessage =
    payload.decision === "APPROVED"
      ? `Your requisition '${requisition.requestNumber}' has been fully approved and is pending distribution.`
      : payload.decision === "PARTIALLY_APPROVED"
      ? `Your requisition '${requisition.requestNumber}' has been partially approved.${payload.comments ? ` Reviewer comments: ${payload.comments}` : ""}`
      : `Your requisition '${requisition.requestNumber}' was rejected.${payload.comments ? ` Reason: ${payload.comments}` : ""}`;

  await NotificationService.createNotification({
    userId: requisition.requesterId,
    type: "REQUISITION",
    title: `Requisition ${payload.decision.replace("_", " ")}`,
    message: reviewMessage,
    referenceType: "Requisition",
    referenceId: requisition.id,
  });

  return updatedRequisition;
};

// ════════════════════════════════════════════════════════════
// 5. CANCEL REQUISITION
// ════════════════════════════════════════════════════════════

const cancelRequisition = async (id: string, reason: string | undefined, user: IAuthUser) => {
  const requisition = await prisma.requisition.findUnique({
    where: { id },
  });

  if (!requisition) {
    throw new ApiError(httpStatus.NOT_FOUND, "Requisition not found!");
  }

  const cancellableStatuses: RequestStatus[] = [
    RequestStatus.DRAFT,
    RequestStatus.SUBMITTED,
    RequestStatus.UNDER_REVIEW,
  ];

  if (!cancellableStatuses.includes(requisition.status)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot cancel requisition in '${requisition.status}' status.`
    );
  }

  if (requisition.requesterId !== user.id && !user.permissions?.includes("requisition.cancel")) {
    throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to cancel this requisition.");
  }

  const updated = await prisma.requisition.update({
    where: { id },
    data: {
      status: RequestStatus.CANCELLED,
      remarks: reason
        ? `${requisition.remarks ? requisition.remarks + " | " : ""}Cancelled reason: ${reason}`
        : requisition.remarks,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: AuditAction.UPDATE,
      module: "Requisition",
      entityType: "Requisition",
      entityId: requisition.id,
      metadata: { reason },
    },
  });

  // Real-time Notification if cancelled by someone else
  if (requisition.requesterId !== user.id) {
    await NotificationService.createNotification({
      userId: requisition.requesterId,
      type: "REQUISITION",
      title: "Requisition Cancelled",
      message: `Your requisition '${requisition.requestNumber}' was cancelled by an administrator.${reason ? ` Reason: ${reason}` : ""}`,
      referenceType: "Requisition",
      referenceId: requisition.id,
    });
  }

  return updated;
};

// ════════════════════════════════════════════════════════════
// 6. QUERIES
// ════════════════════════════════════════════════════════════

const getRequisitionById = async (id: string) => {
  const requisition = await prisma.requisition.findUnique({
    where: { id },
    include: {
      lines: {
        include: {
          inventoryItem: {
            include: {
              category: true,
            },
          },
        },
      },
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          username: true,
          employeeId: true,
        },
      },
      distributions: {
        include: {
          lines: true,
        },
      },
    },
  });

  if (!requisition) {
    throw new ApiError(httpStatus.NOT_FOUND, "Requisition not found!");
  }

  // Also fetch department details manually if needed
  const department = await prisma.department.findUnique({
    where: { id: requisition.departmentId },
  });

  return { ...requisition, department };
};

const getAllRequisitions = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.requisition as any, query, {
    fields: {
      requestNumber: { type: "string", searchable: true, sortable: true, filterable: true },
      type: { type: "string", sortable: true, filterable: true },
      departmentId: { type: "string", filterable: true },
      requesterId: { type: "string", filterable: true },
      status: { type: "string", sortable: true, filterable: true },
      fulfillmentStatus: { type: "string", sortable: true, filterable: true },
      isTemporary: { type: "boolean", filterable: true },
      purpose: { type: "string", searchable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["requestNumber", "purpose"])
    .filter()
    .sort()
    .paginate()
    .include({
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          username: true,
          employeeId: true,
        },
      },
      lines: {
        include: {
          inventoryItem: true,
        },
      },
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const deleteRequisition = async (id: string, user: IAuthUser) => {
  const requisition = await prisma.requisition.findUnique({
    where: { id },
  });

  if (!requisition) {
    throw new ApiError(httpStatus.NOT_FOUND, "Requisition not found!");
  }

  if (requisition.status !== RequestStatus.DRAFT) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Only DRAFT requisitions can be deleted. Current status is '${requisition.status}'.`
    );
  }

  if (requisition.requesterId !== user.id && !user.permissions?.includes("requisition.cancel")) {
    throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to delete this requisition.");
  }

  await prisma.requisitionLine.deleteMany({
    where: { requisitionId: id },
  });

  await prisma.requisition.delete({
    where: { id },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: AuditAction.DELETE,
      module: "Requisition",
      entityType: "Requisition",
      entityId: id,
    },
  });

  return { message: "Requisition deleted successfully" };
};

export const RequisitionService = {
  createRequisition,
  updateRequisition,
  submitRequisition,
  reviewRequisition,
  cancelRequisition,
  getRequisitionById,
  getAllRequisitions,
  deleteRequisition,
};
