import { Types } from "mongoose";

export type TReturnDetails = {
  orderItem: string;
  quantity: number;
  returnedAccessoryCodes: string[];
  returnedAt: Date;
  isReturnedOnTime: boolean;
  returnReceived: string;
} 

export type TOrderItem = {
  accessory: Types.ObjectId;
  expectedQuantity: number;
  providedQuantity: number;
  providedAccessoryCodes: string[];
  returnDeadline?: Date;
  returnedQuantity: number;
  returnedDetails: TReturnDetails[];
} 

type TOrderEvent = {
  event: "pending" | "approved" | "delivered" | "received" | "cancelled";
  date: Date;
  user: Types.ObjectId;
  comments?: string;
} 

export type TOrder = {
  invoiceId: string;
  orderBy: Types.ObjectId;
  items: TOrderItem[];
  orderDate: Date;
  events: TOrderEvent[];
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
} 