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
    quantityDetails: {
      totalQuantity: { type: Number, default: 0 },
      currentQuantity: { type: Number, default: 0 },
      distributedQuantity: { type: Number, default: 0 },
      orderQuantity: { type: Number, default: 0 },
    },
    codeDetails: {
      totalCodes: { type: [String], default: [] },
      currentCodes: { type: [String], default: [] },
      distributedCodes: { type: [String], default: [] },
      orderCodes: { type: [String], default: [] },
    },
    details: [
      detailSchema
    ],
  }
  
);

export const Stock = model<TStock>("Stock", stockSchema);
