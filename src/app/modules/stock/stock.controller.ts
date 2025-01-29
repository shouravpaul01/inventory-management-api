import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { StockService } from "./stock.service";

const createStock = catchAsync(async (req, res) => {
 const {stockId}=req.params
 
  const result = await StockService.createStockDB(stockId,(req as any).files ,req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stock has been successfully updated.",
    data: result,
  });
});
const getAllStocks = catchAsync(async (req, res) => {
    
    const result = await StockService.getAllStocksDB(req.query);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "All stocks retrieved successfully.",
      data: result,
    });
  });
  const updateStockApprovedStatus = catchAsync(async (req, res) => {
    const {stockId,stockDetailsId}=req.query
    
     const result = await StockService.updateStockApprovedStatusDB(req.user,stockId as string,stockDetailsId as string);
     sendResponse(res, {
       statusCode: httpStatus.OK,
       success: true,
       message: "Stock approval successful.",
       data: result,
     });
   });
   const getSingleStock = catchAsync(async (req, res) => {
    const {stockId,stockDetailsId}=req.query
    
     const result = await StockService.getSingleStockDB(stockId as string,stockDetailsId as string);
     sendResponse(res, {
       statusCode: httpStatus.OK,
       success: true,
       message:  "Successfully retrieved the Stock.",
       data: result,
     });
   });
   const updateStock = catchAsync(async (req, res) => {
    const {stockId,stockDetailsId}=req.query
    
     const result = await StockService.updateStockDB(stockId as string,stockDetailsId as string,(req as any).files,req.body);
     sendResponse(res, {
       statusCode: httpStatus.OK,
       success: true,
       message:   "Stock updated successfully.",
       data: result,
     });
   });
  export const StockController={
    createStock,
    getAllStocks,
    updateStockApprovedStatus,
    getSingleStock,
    updateStock
  }