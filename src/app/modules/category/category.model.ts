import { model, Schema } from "mongoose";
import { CategoryModel, TCategory } from "./category.interface";

const categorySchema = new Schema<TCategory, CategoryModel>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    
  }
);
categorySchema.statics.isCategoryNameExists =
  async function isCategoryNameExists(name: string) {
    return await this.findOne({ name: name });
  };
categorySchema.statics.isCategoryCodeExists =
  async function isCategoryNameExists(code: string) {
    return await this.findOne({ code: code });
  };
export const Category = model<TCategory, CategoryModel>(
  "Category",
  categorySchema
);
