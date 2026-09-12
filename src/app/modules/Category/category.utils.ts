/**
 * Normalizes category code to uppercase trimmed string.
 */
export const sanitizeCategoryCode = (code: string): string => {
  return code.trim().toUpperCase();
};

/**
 * Validates that parentId is not pointing to the category's own id.
 */
export const validateSelfParent = (categoryId: string, parentId?: string | null): boolean => {
  return Boolean(parentId && categoryId === parentId);
};

export const CategoryUtils = {
  sanitizeCategoryCode,
  validateSelfParent,
};
