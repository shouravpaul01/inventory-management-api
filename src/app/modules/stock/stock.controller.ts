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
    console.log(req.query)
    const result = await StockService.getAllStocksDB(req.query);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "All stocks retrieved successfully.",
      data: result,
    });
  });

  export const StockController={
    createStock,
    getAllStocks
  }