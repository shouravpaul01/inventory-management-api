import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { UserServices } from "./user.service";

const createFaculty=catchAsync(async(req,res)=>{
    const result =await UserServices.createfacultyDB(req.body)
    return sendResponse(res,{
        statusCode:httpStatus.OK,
        success:true,
        message:"Successfully Creates Faculty.",
        data:result
    })
})
const updateUserApprovedStatus=catchAsync(async(req,res)=>{
const {userId}=req.params
    const result =await UserServices.updateUserApprovedStatusDB(userId,req.body)
    return sendResponse(res,{
        statusCode:httpStatus.OK,
        success:true,
        message:"Successfully Approved.",
        data:result
    })
})
const updateUserActiveStatus=catchAsync(async(req,res)=>{
const {userId}=req.params
    const result =await UserServices.updateUserActiveStatusDB(userId,req.body)
    return sendResponse(res,{
        statusCode:httpStatus.OK,
        success:true,
        message:`${result?.isActive?"Succesfully Unblocked":"Successfully Blocked."}`,
        data:result
    })
})
export const UserControllers={
    createFaculty,
    updateUserApprovedStatus,
    updateUserActiveStatus
}