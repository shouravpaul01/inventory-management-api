import { Types } from "mongoose"



export type TApprovalDetails = {
  isApproved: boolean;
  approvedBy?: Types.ObjectId | string; 
  approvedDate?: Date;
};

export type TStockDetail = {
  _id?: Types.ObjectId | string;
  quantity: number;
  accessoryCodes: string[];
  images:string[],
  isActive:boolean,
  isDeleted:boolean,
  approvalDetails: TApprovalDetails;
  description?: string;
};

export type TQuantityDetails = {
  totalQuantity: number;
  currentQuantity: number;
  distributedQuantity: number;
  orderQuantity: number;
};

export type TCodeDetails = {
  totalCodes: string[];
  currentCodes: string[];
  distributedCodes: string[];
  orderCodes: string[];
};

export type TStock = {
  _id?: Types.ObjectId | string;
  quantityDetails: TQuantityDetails;
  codeDetails: TCodeDetails;
  details: TStockDetail[];
  createdAt?: Date;
  updatedAt?: Date;
};
