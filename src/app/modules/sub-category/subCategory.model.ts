import { model, Schema } from "mongoose";
import { SubCatModel, TSubCategory } from "./subCategory.interface";

const categorySchema = new Schema<TSubCategory, SubCatModel>(
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
  },
  {
    timestamps: true,
  }
);
categorySchema.statics.isSubCatNameExists = async function isSubCatNameExists(
  name: string
) {
  return await this.findOne({ name: name });
};
export const SubCategory = model<TSubCategory, SubCatModel>(
  "SubCategory",
  categorySchema
);
