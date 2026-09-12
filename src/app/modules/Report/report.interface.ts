export interface IDashboardOverviewResult {
  catalog: {
    totalItems: number;
    departments: number;
  };
  serializedAssets: {
    total: number;
    inStock: number;
    issued: number;
    damaged: number;
    maintenance: number;
  };
  bulkStock: {
    totalQuantity: number;
    availableQuantity: number;
    reservedQuantity: number;
  };
  requisitions: {
    pendingReview: number;
    approvedPendingIssue: number;
  };
}

export interface ILocationStockBalance {
  locationName: string;
  locationCode: string;
  quantity: number;
  available: number;
}

export interface ILowStockItem {
  id: string;
  code: string;
  name: string;
  category?: string;
  trackingType: string;
  minimumStock: number;
  reorderLevel: number;
  currentTotal: number;
  currentAvailable: number;
  isBelowMinimum: boolean;
  isBelowReorder: boolean;
  needsReorder: boolean;
  balancesByLocation: ILocationStockBalance[];
}

export interface ILowStockReportResult {
  totalAlerts: number;
  data: ILowStockItem[];
}
