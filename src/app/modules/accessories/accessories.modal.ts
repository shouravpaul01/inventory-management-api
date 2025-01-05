import { model, Schema } from "mongoose";
import { TAccessory } from "./accessories.interface";

const accessorySchema = new Schema<TAccessory>({
  name: { type: String, required: true },
  category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
  subCategory: {
    type: Schema.Types.ObjectId,
    ref: "SubCategory",
    required: true,
  },
  image: { type: String },

  codeTitle: { type: String, unique: true },

  description: { type: String },
  isItReturnable: { type: Boolean, default: true },
  stock: {
    type: Schema.Types.ObjectId,
    ref: "Stock",
    required: true,
  },
  status: {
    type: String,
    enum: ["Available", "Low Stock", "Out of Stock"],
    default: "Available",
  },
  isActive: { type: Boolean, default: false },
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
  isDeleted: { type: Boolean, default: false },
});

export const Accessory = model<TAccessory>("Accessory", accessorySchema);
