import { Model, Types } from "mongoose";

export type TSubCategory ={
    name: string;
    category:Types.ObjectId;
    code:string;
    description?: string;
    isActive:boolean
  }

  export interface SubCatModel extends Model<TSubCategory>{
    isSubCatNameExists(name:string):Promise<TSubCategory | null>
    isSubCatCodeExists(code:string):Promise<TSubCategory | null>
  }