import { ConditionStatus } from "@prisma/client";

export type UnitCondition = "NEW" | "GOOD" | "FAIR" | "POOR" | "DAMAGED";

export interface ICreateInventoryUnitPayload {
  inventoryItemId: string;
  uniqueCode?: string;
  serialNumber?: string;
  barcode?: string;
  condition?: UnitCondition | ConditionStatus;
  locationId?: string;
  purchaseDate?: string;
  warrantyEndDate?: string;
  notes?: string;
}

export interface IBatchCreateUnitsPayload {
  inventoryItemId: string;
  count: number;
  locationId?: string;
  condition?: UnitCondition | ConditionStatus;
  notes?: string;
  purchaseDate?: string;
  warrantyEndDate?: string;
}

export interface IUpdateInventoryUnitPayload {
  serialNumber?: string;
  barcode?: string;
  condition?: UnitCondition | ConditionStatus;
  locationId?: string;
  notes?: string;
  warrantyEndDate?: string;
}
