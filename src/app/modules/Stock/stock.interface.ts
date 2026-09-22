export interface IUnitIntakeItem {
  uniqueCode?: string;
  serialNumber?: string;
  condition?: "NEW" | "GOOD" | "FAIR" | "DAMAGED";
  warrantyEndDate?: string;
  purchaseDate?: string;
  notes?: string;
}

export interface IStockInPayload {
  inventoryItemId: string;
  locationId: string;
  quantity: number;
  type?: "PURCHASE" | "STOCK_IN" | "INITIAL_STOCK";
  notes?: string;
  autoGenerateCodes?: boolean;
  units?: IUnitIntakeItem[];
}

export interface IStockOutPayload {
  inventoryItemId: string;
  locationId: string;
  quantity?: number;
  unitIds?: string[];
  type?: "STOCK_OUT" | "DAMAGE" | "LOSS" | "DISPOSAL" | "GIFT";
  notes?: string;
}

export interface ITransferStockPayload {
  inventoryItemId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity?: number;
  inventoryUnitId?: string;
  unitIds?: string[];
  notes?: string;
}

export interface IAdjustStockPayload {
  inventoryItemId: string;
  locationId: string;
  newQuantity: number;
  notes: string;
}

export interface IReserveStockPayload {
  inventoryItemId: string;
  locationId: string;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
}

export interface IReleaseReservationPayload {
  inventoryItemId: string;
  locationId: string;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
}

