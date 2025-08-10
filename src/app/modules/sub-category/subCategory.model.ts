import { model, Schema } from "mongoose";
import { SubCatModel, TSubCategory } from "./subCategory.interface";

import { Types } from "mongoose";
const eventHistorySchema = new Schema({
  eventType: {
    type: String,
    enum: ["created","updated", "approved","activated","deactivated"],
    default: "pending",
  },
  
  performedBy: {
    type: Types.ObjectId,
    ref: "Faculty",
  },
  performedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  comments: {
    type: String,
  },
  
});
const subCategorySchema = new Schema<TSubCategory, SubCatModel>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    eventsHistory:[eventHistorySchema]
  },
  {
    timestamps: true,
  }
);
subCategorySchema.statics.isSubCatNameExists = async function isSubCatNameExists(
  name: string
) {
  return await this.findOne({ name: name });
};
export const SubCategory = model<TSubCategory, SubCatModel>(
  "SubCategory",
  subCategorySchema
);
