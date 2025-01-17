import { Model, Types } from "mongoose";
export type TApprovalDetails = {
  isApproved: boolean;
  approvedBy?: Types.ObjectId | string; 
  approvedDate?: Date;
};
export type TCategory = {
  name: string;
  description?: string;
  isActive: boolean;
  approvalDetails: TApprovalDetails;
};

export interface CategoryModel extends Model<TCategory> {
  isCategoryNameExists(name: string): Promise<TCategory | null>;
}
