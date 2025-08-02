
import { Model, Types } from "mongoose";
export type TEventHistory = {
  eventType: "created" | "updated" | "approved" | "activated" | "deactivated" ;
  performedBy: Types.ObjectId;
  performedAt?: Date;
  comments?: string;
};
export type TCategory = {
  name: string;
  description?: string;
  isActive: boolean;
  isApproved:boolean;
  isDeleted:boolean;
  eventsHistory: TEventHistory[];
};

export interface CategoryModel extends Model<TCategory> {
  isCategoryNameExists(name: string): Promise<TCategory | null>;
}
