import { model, Schema, Types } from "mongoose";
import { TAccessory } from "./accessories.interface";
const eventHistorySchema = new Schema({
  eventType: {
    type: String,
    enum: ["created","updated", "approved","activated","deactivated","New Stock"],
    
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
  quantityDetails: {
    totalQuantity: { type: Number, default: 0 },
    currentQuantity: { type: Number, default: 0 },
    distributedQuantity: { type: Number, default: 0 },
    orderQuantity: { type: Number, default: 0 },
  },
  codeDetails: {
    totalCodes: { type: [String], default: [], sort: "asc" },
    currentCodes: { type: [String], default: [], sort: "asc" },
    distributedCodes: { type: [String], default: [], sort: "asc" },
    orderCodes: { type: [String], default: [], sort: "asc" },
  },
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
  isApproved:{ type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  eventsHistory:[eventHistorySchema]
});

export const Accessory = model<TAccessory>("Accessory", accessorySchema);
