import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StockService } from "./stock.service";

const stockIn = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user?.id;
  const result = await StockService.stockIn(req.body, req.file, actorId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Stock received successfully",
    data: result,
  });
});

const stockOut = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user?.id;
  const result = await StockService.stockOut(req.body, req.file, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stock issued / written-off successfully",
    data: result,
  });
});

const transferStock = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user?.id;
  const result = await StockService.transferStock(req.body, req.file, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stock transferred successfully",
    data: result,
  });
});

const adjustStock = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user?.id;
  const result = await StockService.adjustStock(req.body, req.file, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stock adjusted and reconciled successfully",
    data: result,
  });
});

const reserveStock = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user?.id;
  const result = await StockService.reserveStock(req.body, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stock quantity reserved successfully",
    data: result,
  });
});

const releaseReservation = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user?.id;
  const result = await StockService.releaseReservation(req.body, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stock reservation released successfully",
    data: result,
  });
});

const getAllStockBalances = catchAsync(async (req: Request, res: Response) => {
  const result = await StockService.getAllStockBalances(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stock balances retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAllStockMovements = catchAsync(async (req: Request, res: Response) => {
  const result = await StockService.getAllStockMovements(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stock movements retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const StockController = {
  stockIn,
  stockOut,
  transferStock,
  adjustStock,
  reserveStock,
  releaseReservation,
  getAllStockBalances,
  getAllStockMovements,
};
