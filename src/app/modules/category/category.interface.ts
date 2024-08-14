import { Model } from "mongoose";

export type TCategory ={
    name: string;
    code:string;
    description?: string;
    isActive:boolean
  }

  export interface CategoryModel extends Model<TCategory>{
    isCategoryNameExists(name:string):Promise<TCategory | null>
    isCategoryCodeExists(code:string):Promise<TCategory | null>
  }