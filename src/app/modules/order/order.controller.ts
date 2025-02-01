import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { OrderServices } from "./order.service";

const createOrder=catchAsync(async(req,res)=>{
    const result = await OrderServices.createOrderDB(req.user,req.body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Order placed successfully.",
      data: result,
    });
})
const getAllOrders = catchAsync(async (req, res) => {
  const result = await OrderServices.getAllOrdersDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All orders retrieved successfully.",
    data: result,
  });
});
const updateEventStatus = catchAsync(async (req, res) => {
  const {orderId}=req.params
  const {event}=req.query
  const result = await OrderServices.updateEventStatusDB(req.user,orderId,event as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully updated.",
    data: result,
  });
});
export const OrderController={
    createOrder,
    getAllOrders,
    updateEventStatus
}