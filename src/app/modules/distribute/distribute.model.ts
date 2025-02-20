import { model, Schema, Types } from "mongoose";
import { TDistribute } from "./distribute.interface";

const AccessoryItemSchema = new Schema({
  accessory: {
    type: Types.ObjectId,
    ref: "Accessory",
    required: true,
  },
  distributedQuantity: {
    type: Number,
    required: true,
    min: 1,
  },
  distributedAccessoryCodes: {
    type: [String],
    default: [],
  },
  isDistributed: {
    type: Boolean,
    default: false,
  },
});

const distibuteEventSchema = new Schema({
  event: {
    type: String,
    enum: ["pending", "approved", "delivered", "received", "cancelled"],
    default: "pending",
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  user: {
    type: Types.ObjectId,
    ref: "User",
  },
  comments: {
    type: String,
  },
});

const distributeSchema = new Schema<TDistribute | undefined>(
  {
    invoiceId: {
      type: String,

      unique: true,
    },
    distributedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [AccessoryItemSchema],
      required: true,
    },
    distributedDate: {
      type: Date,
      default: Date.now,
    },
    location: {
      type: {
        type: String,
      },
      palce: {
        type: String,
      },
    },

    events: {
      type: [distibuteEventSchema],
    },

    comments: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Distibute = model("Distibute", distributeSchema);
