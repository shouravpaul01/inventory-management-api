import { model, Schema, Types } from "mongoose";
import { TReturnDetails } from "./order.interface";

const ReturnDetailsSchema = new Schema<TReturnDetails | undefined>({
  orderItem: {
    type: Types.ObjectId,
    
  },
  quantity: {
    type: Number,
  },
  returnedAccessoryCodes: [String],
  returnedAt: {
    type: Date,
    default: Date.now,
  },
  isReturnedOnTime: {
    type: Boolean,
    default: function (this:any ) {
      return this.returnedAt <= this.parent().returnDeadline!;
    },
  },
  returnReceived: {
    type: Types.ObjectId,
    ref:"User"
  },
});

const AccessoryItemSchema = new Schema(
  {
    accessory: {
      type: Types.ObjectId,
      ref: "Accessory",
      required: true,
    },
    expectedQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    providedQuantity: {
      type: Number,
     
    },
    providedAccessoryCodes: {
      type: [String],
      default: [],
    },
    returnDeadline: {
      type: Date,
    },
    returnedQuantity: {
      type: Number,
      default: 0,
    },
    
    returnedDetails: [ReturnDetailsSchema],
  },
  { _id: false }
);

const OrderEventSchema = new Schema({
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

const orderSchema = new Schema(
  {
    invoiceId: {
      type: String,

      unique: true,
    },
    orderBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [AccessoryItemSchema],
      required: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    events: {
      type: [OrderEventSchema],
    },

    comments: {
      type: String,
    },
  },
  { timestamps: true }
);
orderSchema.pre("save", async function (next) {
  if (!this.isNew) return next();
  if (this.events.length === 0) {
    this.events.push({
      event: "pending",
      date: new Date(),
      user: this.orderBy,
    });
  }

  const date = new Date();
  const year = date.getFullYear();

  const totalOrder = await Order.countDocuments();
  const incrementInvoice = totalOrder + 1;
  this.invoiceId = `ORD-${year}-${incrementInvoice
    .toString()
    .padStart(5, "0")}`;
  next();
});
export const Order = model("Order", orderSchema);
