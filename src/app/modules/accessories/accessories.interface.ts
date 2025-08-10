import { Types } from "mongoose";

export type TEventHistory = {
  eventType:
    | "created"
    | "updated"
    | "approved"
    | "activated"
    | "deactivated"
    | "New Stock";
  performedBy: Types.ObjectId;
  performedAt?: Date;
  comments?: string;
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
export type TAccessory = {
  _id?: Types.ObjectId | string;
  name: string;
  category: Types.ObjectId | string;
  subCategory: Types.ObjectId | string;
  image?: string;
  codeTitle: string;
  description?: string;
  isItReturnable: boolean | string;
  quantityDetails: TQuantityDetails;
  codeDetails: TCodeDetails;
  stock: Types.ObjectId | string;
  status: "Available" | "Low Stock" | "Out of Stock";
  isActive: boolean;
  isApproved: boolean;
  isDeleted: boolean;
  eventsHistory: TEventHistory[];
  createdAt?: Date;
  updatedAt?: Date;
};
