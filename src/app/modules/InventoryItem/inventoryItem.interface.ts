import { IssuePolicy, StockTrackingType } from "@prisma/client";

export interface ICreateInventoryItemPayload {
  name: string;
  code?: string;
  sku?: string;
  description?: string;
  categoryId: string;
  brand?: string;
  model?: string;
  trackingType: "SERIALIZED" | "BULK" | StockTrackingType;
  isReturnable?: boolean;
  defaultIssuePolicy?: "PERMANENT" | "TEMPORARY" | "GIFT" | IssuePolicy;
  unitName?: string;
  minimumStock?: number;
  reorderLevel?: number;
  isActive?: boolean;
}

export interface IUpdateInventoryItemPayload {
  name?: string;
  sku?: string;
  description?: string;
  categoryId?: string;
  brand?: string;
  model?: string;
  trackingType?: "SERIALIZED" | "BULK" | StockTrackingType;
  isReturnable?: boolean;
  defaultIssuePolicy?: "PERMANENT" | "TEMPORARY" | "GIFT" | IssuePolicy;
  unitName?: string;
  minimumStock?: number;
  reorderLevel?: number;
  isActive?: boolean;
}

export interface ICreateCodeSequencePayload {
  name: string;
  code: string;
  prefix: string;
  separator?: string;
  startNumber?: number;
  paddingLength?: number;
  yearIncluded?: boolean;
  monthIncluded?: boolean;
  isActive?: boolean;
}

export interface IUpdateCodeSequencePayload {
  name?: string;
  prefix?: string;
  separator?: string;
  paddingLength?: number;
  yearIncluded?: boolean;
  monthIncluded?: boolean;
  isActive?: boolean;
}

export type IInventoryItemUnitStats = Record<string, number>;
