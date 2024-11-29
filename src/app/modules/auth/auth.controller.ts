import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AuthServices } from "./auth.service";

const login=catchAsync(async(req,res)=>{
    const result =await AuthServices.loginDB(req.body)
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Welcome, you’ve successfully logged in.",
        data: result,
      });
})
const changePassword=catchAsync(async(req,res)=>{
    const result =await AuthServices.changePasswordDB(req.body)
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Password changed successfully.Please Login.",
        data: result,
      });
})
const sendOTP=catchAsync(async(req,res)=>{
    const {email}=req.query
    const result =await AuthServices.sendOTPDB(email as string)
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "The OTP has been sent. Please check your Email.",
        data: result,
      });
})
const deleteOTP=catchAsync(async(req,res)=>{
    const {email}=req.query
    const result =await AuthServices.deleteOTPDB(email as string)
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "OTP has been  successfully deleted.",
        data: result,
      });
})
const matchedOTP=catchAsync(async(req,res)=>{
 
    const result =await AuthServices.matchedOTPDB(req.body)
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Verification successful. You can now reset your password.",
        data: result,
      });
})
const resetPassword=catchAsync(async(req,res)=>{
    console.log(req.body,"sss")
    const result =await AuthServices.resetPasswordDB(req.body)
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "You have successfully reset your password.Please login.",
        data: result,
      });
})
export const AuthControllers={
    login,
    changePassword,
    sendOTP,
    deleteOTP,
    matchedOTP,
    resetPassword
}