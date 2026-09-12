export interface IReturnLineInput {
  inventoryItemId: string;
  inventoryUnitId?: string;
  destinationLocationId: string;
  quantity: number;
  condition: "SAME" | "GOOD" | "DAMAGED" | "LOST" | "NEEDS_REPAIR";
  remarks?: string;
}

export interface IReturnLocationSplit {
  locationId: string;
  quantity: number;
}

export interface IProcessReturnPayload {
  distributionId: string;
  remarks?: string;
  status?: "EXPECTED" | "PARTIALLY_RETURNED" | "RETURNED" | "OVERDUE" | "LOST";
  lines: IReturnLineInput[];
  locationSplits?: IReturnLocationSplit[];
}
