import mongoose, { Types } from "mongoose";



type TAccessoryEvent = {
  event: "assigned" | "returned" | "overdue";
  date: Date;
  user: Types.ObjectId;
};

export type TOrderItem = {
  accessory: Types.ObjectId;
  quantity: number;
  codes:string[]
  returnDeadline: Date;
  events: TAccessoryEvent[];
};

type TOrderEvent = {
  event: "pending" | "approved" | "received" | "handover" | "cancelled";
  date: Date;
  user: Types.ObjectId;
  comments?: string;
};

export type AccessoryOrder = mongoose.Document & {
  _id?: Types.ObjectId;
  invoiceId: string;
  orderBy: Types.ObjectId;
  accessories: TOrderItem[];
  orderDate: Date;
  events: TOrderEvent[];
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
};
