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
categorySchema.statics.isSubCatNameExists =
  async function isSubCatNameExists(name: string) {
    return await this.findOne({ name: name });
  };
categorySchema.statics.isSubCatCodeExists =
  async function isSubCatCodeExists(code: string) {
    return await this.findOne({ code: code });
  };
export const SubCategory = model<TSubCategory, SubCatModel>(
  "SubCategory",
  categorySchema
);
