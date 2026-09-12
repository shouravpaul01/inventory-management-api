/**
 * Safely parses and validates a 24-character hexadecimal MongoDB ObjectId string.
 * Returns the valid string if valid, otherwise undefined.
 */
export const toValidObjectId = (id?: string | null): string | undefined => {
  if (id && /^[0-9a-fA-F]{24}$/.test(id)) {
    return id;
  }
  return undefined;
};

/**
 * Builds standard notification titles and messages for requisitions.
 */
export const formatRequisitionNotification = (
  action: "SUBMITTED" | "APPROVED" | "PARTIALLY_APPROVED" | "REJECTED" | "CANCELLED",
  requestNumber: string,
  extra?: string
) => {
  switch (action) {
    case "SUBMITTED":
      return {
        title: "Requisition Submitted",
        message: `Requisition '${requestNumber}' has been submitted.${extra ? ` ${extra}` : ""}`,
      };
    case "APPROVED":
      return {
        title: "Requisition Approved",
        message: `Your requisition '${requestNumber}' has been fully approved and is pending distribution.`,
      };
    case "PARTIALLY_APPROVED":
      return {
        title: "Requisition Partially Approved",
        message: `Your requisition '${requestNumber}' was partially approved.${extra ? ` Remarks: ${extra}` : ""}`,
      };
    case "REJECTED":
      return {
        title: "Requisition Rejected",
        message: `Your requisition '${requestNumber}' was rejected.${extra ? ` Reason: ${extra}` : ""}`,
      };
    case "CANCELLED":
      return {
        title: "Requisition Cancelled",
        message: `Requisition '${requestNumber}' has been cancelled.${extra ? ` Reason: ${extra}` : ""}`,
      };
  }
};

/**
 * Builds standard notification titles and messages for approval requests.
 */
export const formatApprovalNotification = (
  action: "PENDING" | "APPROVED" | "REJECTED" | "CORRECTION" | "ADVANCED",
  requestNumber: string,
  extra?: string
) => {
  switch (action) {
    case "PENDING":
      return {
        title: "Approval Action Required",
        message: `Approval request '${requestNumber}' requires your review.${extra ? ` (${extra})` : ""}`,
      };
    case "APPROVED":
      return {
        title: "Approval Request Approved",
        message: `Approval request '${requestNumber}' has been approved.${extra ? ` ${extra}` : ""}`,
      };
    case "REJECTED":
      return {
        title: "Approval Request Rejected",
        message: `Approval request '${requestNumber}' was rejected.${extra ? ` Reason: ${extra}` : ""}`,
      };
    case "CORRECTION":
      return {
        title: "Returned For Correction",
        message: `Approval request '${requestNumber}' was returned for correction.${extra ? ` Notes: ${extra}` : ""}`,
      };
    case "ADVANCED":
      return {
        title: "Approval Request Advanced",
        message: `Approval request '${requestNumber}' has advanced to the next approval tier.${extra ? ` ${extra}` : ""}`,
      };
  }
};

/**
 * Builds standard notification titles and messages for distribution and delivery.
 */
export const formatDistributionNotification = (
  action: "ISSUED" | "DELIVERED",
  distributionNo: string,
  extra?: string
) => {
  switch (action) {
    case "ISSUED":
      return {
        title: "Inventory Distributed",
        message: `Distribution '${distributionNo}' has been issued to you.${extra ? ` ${extra}` : " Please confirm delivery receipt."}`,
      };
    case "DELIVERED":
      return {
        title: "Delivery Receipt Confirmed",
        message: `Delivery receipt for distribution '${distributionNo}' was successfully confirmed.${extra ? ` Status: ${extra}` : ""}`,
      };
  }
};

/**
 * Builds standard notification titles and messages for returns.
 */
export const formatReturnNotification = (
  action: "PROCESSED" | "DAMAGE_ALERT",
  returnNumber: string,
  extra?: string
) => {
  switch (action) {
    case "PROCESSED":
      return {
        title: "Return Processed",
        message: `Return transaction '${returnNumber}' has been received into inventory.${extra ? ` ${extra}` : ""}`,
      };
    case "DAMAGE_ALERT":
      return {
        title: "Damage/Loss Return Alert",
        message: `Return '${returnNumber}' was completed with reported damaged or lost items!${extra ? ` ${extra}` : ""}`,
      };
  }
};

export const NotificationUtils = {
  toValidObjectId,
  formatRequisitionNotification,
  formatApprovalNotification,
  formatDistributionNotification,
  formatReturnNotification,
};
