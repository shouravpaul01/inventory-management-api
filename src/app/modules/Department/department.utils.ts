/**
 * Normalizes department code to trimmed uppercase format.
 */
export const sanitizeDepartmentCode = (code: string): string => {
  return code.trim().toUpperCase();
};

export const DepartmentUtils = {
  sanitizeDepartmentCode,
};
