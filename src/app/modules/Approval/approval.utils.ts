export {
  evaluateCondition,
  evaluateRule,
  IConditionRule,
  IConditionGroup,
} from "./approval.evaluator";

/**
 * Checks if user is eligible to act as an approver for a specific record
 */
export const isUserEligibleApprover = (
  userId: string,
  userRoleIds: Set<string>,
  record: { approverId?: string | null; approverRoleId?: string | null }
): boolean => {
  if (record.approverId && record.approverId === userId) {
    return true;
  }
  if (record.approverRoleId && userRoleIds.has(record.approverRoleId)) {
    return true;
  }
  return false;
};

export const ApprovalUtils = {
  isUserEligibleApprover,
};
