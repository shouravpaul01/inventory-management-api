import { Model, Types } from "mongoose";

export type TSubCategory ={
    name: string;
    category:Types.ObjectId ;
    description?: string;
    isActive:boolean;
    isApproved: boolean;
  }

  export interface SubCatModel extends Model<TSubCategory>{
    isSubCatNameExists(name:string):Promise<TSubCategory | null>
  }