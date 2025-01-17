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
    
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    approvalDetails: {
      isApproved: {
        type: Boolean,
        default: false,
      },
      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      approvedDate: {
        type: Date,
      },
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

export const Category = model<TCategory, CategoryModel>(
  "Category",
  categorySchema
);
