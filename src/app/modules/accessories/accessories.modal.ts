import { model, Schema } from "mongoose";
import { TAccessory } from "./accessories.interface";

const accessorySchema = new Schema<TAccessory>({
    name: { type: String, required: true },
    category: { type: Schema.Types.ObjectId,ref:"Category",required: true }, 
    subCategory: {type: Schema.Types.ObjectId,ref:"SubCategory", required: true },
    image: { type: String },
    quantityDetails: {
      totalQuantity: { type: Number, required: true },
      currentQuantity: { type: Number, required: true },
      distributedQuantity: { type: Number, default: 0 },
      orderQuantity: { type: Number, default: 0 },
    },
    codeDetails: {
      codeTitle:{type: String, required: true,unique:true},
      totalCodes: { type: [String], required: true },
      currentCodes: { type: [String], required: true },
      distributedCodes: { type: [String], default: 0 },
      orderCodes: { type: [String], default: 0 },
    },
    description: { type: String },
    isItReturnable: { type: Boolean, default: true },
    status: { type: String, enum: ['Available', 'Out of Stock'], default: 'Available' },
    isActive:{type:Boolean,default:false},
    isApproved:{type:Boolean,default:false},
    isDeleted:{type:Boolean,default:false}
  });

  export const Accessory=model<TAccessory>("Accessory",accessorySchema)