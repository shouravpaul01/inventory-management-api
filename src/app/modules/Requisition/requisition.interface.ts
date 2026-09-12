export interface IRequisitionLineInput {
  inventoryItemId: string;
  requestedQty: number;
  requestedIssuePolicy?: "PERMANENT" | "TEMPORARY" | "GIFT";
  remarks?: string;
}

export interface ICreateRequisitionPayload {
  type?: "REQUISITION" | "ORDER";
  departmentId: string;
  purpose: string;
  remarks?: string;
  isTemporary?: boolean;
  requiredFrom?: Date;
  requiredUntil?: Date;
  lines: IRequisitionLineInput[];
}

export interface IUpdateRequisitionPayload {
  purpose?: string;
  remarks?: string;
  isTemporary?: boolean;
  requiredFrom?: Date;
  requiredUntil?: Date;
  lines?: Array<IRequisitionLineInput & { id?: string }>;
}

export interface IReviewLineInput {
  lineId: string;
  approvedQty: number;
  status: "APPROVED" | "PARTIALLY_APPROVED" | "REJECTED";
  remarks?: string;
}

export interface IReviewRequisitionPayload {
  decision: "APPROVED" | "PARTIALLY_APPROVED" | "REJECTED";
  comments?: string;
  lines: IReviewLineInput[];
}
