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



export type TStock = {
  _id?: Types.ObjectId | string;
  
  details: TStockDetail[];
  createdAt?: Date;
  updatedAt?: Date;
};
