import { model, Schema } from "mongoose";
import { TStock } from "./stock.interface";
const detailSchema = new Schema(
  {
    quantity: { type: Number, required: true },
    accessoryCodes: { type: [String], default: [] },
    images: { type: [String] },
    description: { type: String },
    isActive: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    approvalDetails: {
      isApproved: { type: Boolean, default: false },
      approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
      approvedDate: { type: Date },
    },
  },
  {
    timestamps: true, 
  }
);
const stockSchema = new Schema<TStock>(
  {
    
    details: [
      detailSchema
    ],
  }
  
);

export const Stock = model<TStock>("Stock", stockSchema);
