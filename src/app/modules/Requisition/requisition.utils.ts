import { RequestLineStatus, RequestStatus } from "@prisma/client";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";

/**
 * Validates that all requested items are returnable if requisition is temporary
 */
export const validateReturnableItems = (
  items: Array<{ name: string; isReturnable: boolean }>
): void => {
  const nonReturnable = items.find((i) => !i.isReturnable);
  if (nonReturnable) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Item '${nonReturnable.name}' is non-returnable and cannot be requested under a temporary requisition.`
    );
  }
};

/**
 * Calculates overall requisition status based on reviewed lines and decision
 */
export const calculateRequisitionReviewStatus = (
  updatedLines: Array<{
    status: RequestLineStatus;
    approvedQty: number;
    requestedQty: number;
  }>,
  decision: "APPROVED" | "PARTIALLY_APPROVED" | "REJECTED"
): RequestStatus => {
  const allRejected = updatedLines.every(
    (l) => l.status === RequestLineStatus.REJECTED || l.approvedQty === 0
  );
  const allApproved = updatedLines.every(
    (l) => l.status === RequestLineStatus.APPROVED && l.approvedQty === l.requestedQty
  );

  if (decision === "REJECTED" || allRejected) {
    return RequestStatus.REJECTED;
  }
  if (allApproved) {
    return RequestStatus.APPROVED;
  }
  return RequestStatus.PARTIALLY_APPROVED;
};

export const RequisitionUtils = {
  validateReturnableItems,
  calculateRequisitionReviewStatus,
};
