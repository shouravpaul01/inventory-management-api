import { model, Schema, Types } from "mongoose";
import { TDistribute } from "./distribute.interface";
import { TReturnDetails } from "../order/order.interface";
const ReturnDetailsSchema = new Schema<TReturnDetails | undefined>({
  accessory: {
    type: Types.ObjectId,
  },
  quantity: {
    type: Number,
  },
  returnedAccessoriesCodes: [String],
  returnedAt: {
    type: Date,
    default: Date.now,
  },
  isReturnedOnTime: {
    type: Boolean,
    default: function (this: any) {
      return this.returnedAt <= this.parent().returnDeadline!;
    },
  },
  isReturnReceived: {
    type: Boolean,
    default: false,
  },
  returnReceivedBy: {
    type: Types.ObjectId,
    ref: "User",
  },
});
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

  returnedQuantity: {
    type: Number,
    default: 0,
  },
  returnedAllAccessoriesCodes: { type: [String], default: [] },
  isAllAccessoriesReturned: {
    type: Boolean,
    default: false,
  },
  returnedDetails: [ReturnDetailsSchema],
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
    
     requester: {
      type: Types.ObjectId,
      ref: "User",
      
    },
    items: {
      type: [AccessoryItemSchema],
      required: true,
    },
    distributedDate: {
      type: Date,
      default: Date.now,
    },
    distributedTo: {
      locationType: {
        type: String,
     
        required: true,
      },
      facultyMember: {
        type: Types.ObjectId,
        ref: "Faculty",
      },
      department: {
        type: String,
      },
      roomNo: {
        type: String,
      },
      place: {
        type: String,
      },
    },
    events: {
      type: [distibuteEventSchema],
    },
     purpose: {
      type: String,
      enum: [
        "academic", 
        "research", 
        "administrative", 
        "event", 
        "maintenance",
        "other"
      ],
      required: true
    },
    description: {
      type: String,
    },
   
  },
  { timestamps: true }
);

export const Distibute = model("Distribute", distributeSchema);
