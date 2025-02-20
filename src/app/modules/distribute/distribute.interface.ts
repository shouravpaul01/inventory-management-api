import { Types } from "mongoose";

export type AccessoryItem = {
    accessory: Types.ObjectId;
    distributedQuantity: number;
    distributedAccessoryCodes: string[];
    isDistributed: boolean;
} & Document;

export type DistributeEvent = {
    event: "pending" | "approved" | "delivered" | "received" | "cancelled";
    date: Date;
    user: Types.ObjectId;
    comments?: string;
} & Document;

export type Location = {
    type?: string;
    place?: string; 
};

export type TDistribute = {
    invoiceId: string;
    distributedBy: Types.ObjectId;
    items: AccessoryItem[];
    distributedDate: Date;
    location: Location;
    events: DistributeEvent[];
    comments?: string;
    createdAt: Date;
    updatedAt: Date;
} & Document;