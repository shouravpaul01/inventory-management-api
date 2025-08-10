import { Model, Types } from "mongoose";

export type TEventHistory = {
  eventType: "created" | "updated" | "approved" | "activated" | "deactivated";
  performedBy: Types.ObjectId;
  performedAt?: Date;
  comments?: string;
};

export type TSubCategory = {
  name: string;
  category: Types.ObjectId;
  description?: string;
  isActive: boolean;

  isApproved: boolean;
  isDeleted: boolean;
  eventsHistory: TEventHistory[];
};

export interface SubCatModel extends Model<TSubCategory> {
  isSubCatNameExists(name: string): Promise<TSubCategory | null>;
}
