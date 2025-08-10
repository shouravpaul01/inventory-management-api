import { model, Schema, Types } from "mongoose";
import { TStock } from "./stock.interface";
const eventHistorySchema = new Schema({
  eventType: {
    type: String,
    enum: ["created", "updated", "approved", "activated", "deactivated" ,"stock"],
  },

  performedBy: {
    type: Types.ObjectId,
    ref: "User",
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
const detailSchema = new Schema(
  {
    quantity: { type: Number, required: true },
    accessoryCodes: { type: [String], default: [] },
    documentImages: { type: [String], default: [] },
    locatedDetails: {
      roomNo: { type: String, trim: true },
      place: { type: String, trim: true },
      locatedImages: { type: [String], default: [] },
    },
    description: { type: String },
    isActive: { type: Boolean, default: false },
    isApproved:{ type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    eventsHistory: [eventHistorySchema],
  },
  {
    timestamps: true,
  }
);
const stockSchema = new Schema<TStock>({
  details: [detailSchema],
});

export const Stock = model<TStock>("Stock", stockSchema);
