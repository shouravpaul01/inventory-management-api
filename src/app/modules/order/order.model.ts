import mongoose, { Schema } from "mongoose";

const AccessoryEventSchema = new Schema({
  event: {
    type: String,
    enum: ["notReturned", "returnedOnTime", "overdue"],
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  user: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const AccessoryItemSchema = new Schema(
  {
    accessory: {
      type: mongoose.Types.ObjectId,
      ref: "Accessory",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    codes: {
      type: [String],
      default: [],
    },
    returnDeadline: {
      type: Date,
      
    },

    events: [AccessoryEventSchema],
  },
  { _id: false }
);

const OrderEventSchema = new Schema(
  {
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
      type: mongoose.Types.ObjectId,
      ref: "User",
      
    },
    comments: {
      type: String,
    },
  }
);

const AccessoryOrderSchema = new Schema(
  {
    invoiceId: {
      type: String,
      required: true,
      unique: true,
    },
    orderBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    accessories: {
      type: [AccessoryItemSchema],
      required: true,
    },
    orderDate: {
      type: Date,
      required: true,
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
AccessoryOrderSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  const date = new Date();
  const year = date.getFullYear();

  const totalOrder = await Order.countDocuments();
  const incrementInvoice = totalOrder + 1;
  this.invoiceId = `ORD-${year}-${incrementInvoice
    .toString()
    .padStart(5, "0")}`;
  next();
});
export const Order = mongoose.model(
  "Order",
  AccessoryOrderSchema
);
