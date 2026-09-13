/**
 * Derives a standardized uppercase prefix for an item from a category code.
 */
export const deriveCategoryPrefix = (categoryCode: string, length = 3): string => {
  return categoryCode.slice(0, length).toUpperCase();
};

/**
 * Aggregates unit counts by unit status.
 */
export const aggregateUnitStats = (
  units: Array<{ status: string; _count: { _all: number } }>
): Record<string, number> => {
  return units.reduce((acc, curr) => {
    acc[curr.status] = curr._count._all;
    return acc;
  }, {} as Record<string, number>);
};

/**
 * Sanitizes item code or sku into trimmed uppercase format.
 */
export const sanitizeItemIdentifier = (identifier?: string): string | undefined => {
  if (!identifier) return undefined;
  return identifier.trim().toUpperCase();
};

export const InventoryItemUtils = {
  deriveCategoryPrefix,
  aggregateUnitStats,
  sanitizeItemIdentifier,
};
