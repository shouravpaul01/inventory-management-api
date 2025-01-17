import { Model, Types } from "mongoose";

export type TApprovalDetails = {
  isApproved: boolean;
  approvedBy?: Types.ObjectId | string; 
  approvedDate?: Date;
};

export type TSubCategory ={
    name: string;
    category:Types.ObjectId ;
    description?: string;
    isActive:boolean;
    approvalDetails: TApprovalDetails;
  }

  export interface SubCatModel extends Model<TSubCategory>{
    isSubCatNameExists(name:string):Promise<TSubCategory | null>
  }