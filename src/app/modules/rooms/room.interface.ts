import { Types } from "mongoose";
export type TApprovalDetails = {
  isApproved: boolean;
  approvedBy?: Types.ObjectId | string;
  approvedDate?: Date;
};
export type TRoom = {
  roomNo: string;
  department: string;
  building: string;
  floor: string;
  roomType: string;
  capacity?: number;
  images?: string[];
  description?: string;

  features: string[];
  equipment: {
    accessories: {
      accessory: Types.ObjectId;
      quantity: number;
      codes: string[];
    }[];
    totalQuantity: number;
  }[];
  isActive: boolean;
  createdBy: Types.ObjectId;
  approvalDetails: TApprovalDetails;
  createdAt: Date;
  updatedAt: Date;
};
