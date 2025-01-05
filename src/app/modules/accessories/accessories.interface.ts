import { Types } from "mongoose";

export type TApprovalDetails = {
  isApproved: boolean;
  approvedBy?: Types.ObjectId | string; 
  approvedDate?: Date;
};

export type TAccessory = {
  _id?: Types.ObjectId | string;
  name: string;
  category: Types.ObjectId | string; 
  subCategory: Types.ObjectId | string;
  image?: string;
  codeTitle: string;
  description?: string;
  isItReturnable: boolean;
  stock: Types.ObjectId | string; 
  status: "Available" | "Low Stock" | "Out of Stock";
  isActive: boolean;
  approvalDetails: TApprovalDetails;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
