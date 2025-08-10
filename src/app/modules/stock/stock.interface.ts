import { Types } from "mongoose";

export type TEventHistory = {
  eventType: "created" | "updated" | "approved" | "activated" | "deactivated" | "stock";
  performedBy: Types.ObjectId;
  performedAt?: Date;
  comments?: string;
};

export type TStockDetail = {
  _id?: Types.ObjectId | string;
  quantity: number;
  accessoryCodes: string[];
  documentImages: string[];
  locatedDetails:{
    roomNo:string,
    place:string,
    locatedImages:string[]
  }
  isActive: boolean;
  isDeleted: boolean;
  isApproved: boolean;
  description?: string;
  eventsHistory: TEventHistory[];
};

export type TStock = {
  _id?: Types.ObjectId | string;

  details: TStockDetail[];
  createdAt?: Date;
  updatedAt?: Date;
};
