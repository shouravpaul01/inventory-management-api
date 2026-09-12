import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";

/**
 * Normalizes role code to uppercase trimmed string.
 */
export const sanitizeRoleCode = (code: string): string => {
  return code.trim().toUpperCase();
};

/**
 * Asserts that a role is not protected as a system-defined role before modifying or deleting.
 */
export const assertNonSystemRole = (isSystemRole: boolean, action = "modify"): void => {
  if (isSystemRole) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `System protected roles cannot be ${action}ed!`
    );
  }
};

export const RbacUtils = {
  sanitizeRoleCode,
  assertNonSystemRole,
};
