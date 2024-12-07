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
  quantityDetails: {
    totalQuantity: { type: Number, default:0 },
    currentQuantity: { type: Number, default: 0 },
    distributedQuantity: { type: Number, default: 0 },
    orderQuantity: { type: Number, default: 0 },
  },
  codeDetails: {
    codeTitle: { type: String,  unique: true },
    totalCodes: { type: [String],default: [] },
    currentCodes: { type: [String] ,default: []},
    distributedCodes: { type: [String], default: [] },
    orderCodes: { type: [String], default: [] },
  },

  description: { type: String },
  isItReturnable: { type: Boolean, default: true },
  status: {
    type: String,
    enum: ["Available","Low Stock", "Out of Stock"],
    default:"Available"
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
    approvedDate:{
      type:Date
    }
  },
  isDeleted: { type: Boolean, default: false },
});

export const Accessory = model<TAccessory>("Accessory", accessorySchema);
