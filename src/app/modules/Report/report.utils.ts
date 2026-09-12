import { ILocationStockBalance, ILowStockItem } from "./report.interface";

/**
 * Calculates whether an inventory item has breached minimum or reorder stock thresholds.
 */
export const calculateStockThresholds = (
  currentAvailable: number,
  minimumStock: number,
  reorderLevel: number
) => {
  const isBelowMinimum = currentAvailable <= minimumStock;
  const isBelowReorder = currentAvailable <= reorderLevel;
  return {
    isBelowMinimum,
    isBelowReorder,
    needsReorder: isBelowMinimum || isBelowReorder,
  };
};

/**
 * Maps an item with stock balances into a standardized low-stock report record.
 */
export const transformToLowStockRecord = (item: {
  id: string;
  code: string;
  name: string;
  category?: { name: string } | null;
  trackingType: string;
  minimumStock: number;
  reorderLevel: number;
  stockBalances: Array<{
    quantity: number;
    availableQuantity: number;
    location: { name: string; code: string };
  }>;
}): ILowStockItem => {
  const totalAvailable = item.stockBalances.reduce((sum, b) => sum + b.availableQuantity, 0);
  const totalQuantity = item.stockBalances.reduce((sum, b) => sum + b.quantity, 0);
  const thresholds = calculateStockThresholds(totalAvailable, item.minimumStock, item.reorderLevel);

  const balancesByLocation: ILocationStockBalance[] = item.stockBalances.map((b) => ({
    locationName: b.location.name,
    locationCode: b.location.code,
    quantity: b.quantity,
    available: b.availableQuantity,
  }));

  return {
    id: item.id,
    code: item.code,
    name: item.name,
    category: item.category?.name,
    trackingType: item.trackingType,
    minimumStock: item.minimumStock,
    reorderLevel: item.reorderLevel,
    currentTotal: totalQuantity,
    currentAvailable: totalAvailable,
    ...thresholds,
    balancesByLocation,
  };
};

export const ReportUtils = {
  calculateStockThresholds,
  transformToLowStockRecord,
};
