export interface IDistributionLineInput {
  requisitionLineId?: string;
  inventoryItemId: string;
  inventoryUnitId?: string;
  locationId: string;
  quantity: number;
  issueMode?: "PERMANENT" | "TEMPORARY" | "GIFT";
  condition?: "NEW" | "GOOD" | "FAIR" | "DAMAGED" | "LOST" | "DISPOSED";
  expectedReturnAt?: Date;
  remarks?: string;
}

export interface ICreateDistributionPayload {
  requisitionId: string;
  receiverId: string;
  issueMode?: "PERMANENT" | "TEMPORARY" | "GIFT";
  handoverMethod?: "SELF_COLLECTION" | "DELIVERED_BY_STAFF" | "COURIER" | "OTHER";
  expectedReturnAt?: Date;
  remarks?: string;
  lines: IDistributionLineInput[];
}

export interface IConfirmDeliveryPayload {
  deliveryStatus: "DELIVERED" | "RECEIVED" | "REJECTED" | "FAILED";
  receiverRemarks?: string;
  deliveredById?: string;
}
