import { ConditionStatus, InventoryUnitStatus } from "@prisma/client";

/**
 * Maps return condition string to InventoryUnit status and physical condition
 */
export const mapReturnConditionToUnitState = (
  condition: "SAME" | "GOOD" | "DAMAGED" | "LOST" | "NEEDS_REPAIR"
): { unitStatus: InventoryUnitStatus; unitCondition: ConditionStatus } => {
  if (condition === "DAMAGED") {
    return {
      unitStatus: InventoryUnitStatus.DAMAGED,
      unitCondition: ConditionStatus.DAMAGED,
    };
  }
  if (condition === "LOST") {
    return {
      unitStatus: InventoryUnitStatus.LOST,
      unitCondition: ConditionStatus.LOST,
    };
  }
  if (condition === "NEEDS_REPAIR") {
    return {
      unitStatus: InventoryUnitStatus.MAINTENANCE,
      unitCondition: ConditionStatus.FAIR,
    };
  }
  return {
    unitStatus: InventoryUnitStatus.IN_STOCK,
    unitCondition: ConditionStatus.GOOD,
  };
};

/**
 * Aggregates return lines by destination location
 */
export const aggregateReturnLocations = (
  lines: Array<{ destinationLocationId: string; quantity: number }>
): Record<string, number> => {
  const map: Record<string, number> = {};
  for (const line of lines) {
    map[line.destinationLocationId] =
      (map[line.destinationLocationId] || 0) + line.quantity;
  }
  return map;
};

export const ReturnUtils = {
  mapReturnConditionToUnitState,
  aggregateReturnLocations,
};
