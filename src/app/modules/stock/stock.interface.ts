import { Types } from "mongoose"

export type TStock={
    accessory:Types.ObjectId,
    quantity:number,
    accessoryCodes:string[],
    approvalDetails:{
        isApproved:boolean,
        approvedBy:Types.ObjectId,
        approvedDate:string
    },
    description:string
}