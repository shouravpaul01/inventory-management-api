import { Model } from "mongoose";

export type TCategory = {
  name: string;
  description?: string;
  isActive: boolean;
  isApproved: boolean;
};

export interface CategoryModel extends Model<TCategory> {
  isCategoryNameExists(name: string): Promise<TCategory | null>;
}
