import { model, Schema } from "mongoose"
import { TStock } from "./stock.interface"

const stockSchema=new Schema<TStock>({
    accessory:{
        type:Schema.Types.ObjectId,
        ref:"Accessory",
        required:true
    },
    quantity:{
        type:Number,
        required:true
    },
    accessoryCodes:{ type: [String], default: [] },
    approvalDetails:{
        isApproved:{
            type:Boolean,
            default:false
        },
        approvedBy:{
            type:Schema.Types.ObjectId,
            ref:"User",
        }
        ,
        approvedDate: { type: Date },
    },
    description:{
        type:String
    }
},{
    timestamps:true
})

export const Stock= model<TStock>("Stock",stockSchema)