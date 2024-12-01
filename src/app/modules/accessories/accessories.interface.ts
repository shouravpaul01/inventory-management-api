import { Types } from "mongoose";

export type TAccessory = {
    name: string; 
    category: Types.ObjectId; 
    subCategory: Types.ObjectId;  
    image?: string; 
    quantityDetails: {
      totalQuantity: number; 
      currentQuantity: number; 
      distributedQuantity?: number; 
      orderQuantity?: number; 
    };
    codeDetails:{
      codeTitle: string; 
      totalCodes:string[];
      currentCodes:string[];
      distributedCodes?:string[];
      orderCodes?:string[];
    },
    
    description?: string; 
    isItReturnable?: boolean; 
    status?: 'Available' |  'Out of Stock';
    isActive:boolean;
    isApproved:boolean;
    isDeleted:boolean;
  };
  