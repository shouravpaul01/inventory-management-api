import { ApprovalService } from "./approval.service";
import {
  IApprovalInterceptParams,
  IApprovalInterceptResult,
} from "./approval.interface";

/**
 * Universal Approval Interceptor
 *
 * Checks approval requirements across all system modules.
 * If approval is required, creates an ApprovalRequest staging the payload.
 * If approval is not required, executes the mutation directly.
 */
export const executeOrIntercept = async <T>(
  params: IApprovalInterceptParams<T>
): Promise<IApprovalInterceptResult<T>> => {
  const {
    permissionCode,
    entityType,
    action,
    entityId,
    user,
    payload,
    summary,
    executeDirectly,
  } = params;

  // Check if current action requires approval
  const approvalCheck = await ApprovalService.checkApprovalRequirement({
    permissionCode,
    user,
    payload,
  });

  // If approval NOT required (Super Admin, bypassed, or policy exempted):
  if (!approvalCheck.required) {
    const data = await executeDirectly();
    return {
      approvalRequired: false,
      bypassed: approvalCheck.bypassed,
      data,
    };
  }

  // If approval IS required: Intercept and stage payload in ApprovalRequest
  const approvalRequest = await ApprovalService.createApprovalRequest({
    entityType,
    entityId: entityId || "PENDING_CREATION",
    permissionCode,
    requestedBy: user,
    policy: approvalCheck.policy,
    reason: summary,
    metadata: {
      action,
      entityType,
      entityId,
      payload,
      summary,
      requestedByName: `${user.firstName} ${user.lastName || ""}`.trim(),
      requestedByEmail: user.email,
      stagedAt: new Date().toISOString(),
    },
  });

  return {
    approvalRequired: true,
    data: approvalRequest,
    message: "Action has been submitted and is pending Super Admin approval.",
  };
};

export const ApprovalInterceptor = {
  executeOrIntercept,
};
