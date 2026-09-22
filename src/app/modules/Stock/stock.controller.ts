import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StockService } from "./stock.service";
import { ApprovalInterceptor } from "../Approval/approval.interceptor";
import { ApprovalEntityType } from "@prisma/client";

const stockIn = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await ApprovalInterceptor.executeOrIntercept({
    permissionCode: "stock.in",
    entityType: ApprovalEntityType.STOCK_ADJUSTMENT,
    action: "IN",
    user,
    payload: req.body,
    summary: `Stock In intake for item '${req.body.inventoryItemId}', qty: ${req.body.quantity}`,
    executeDirectly: () => StockService.stockIn(req.body, req.file, user.id),
  });

  sendResponse(res, {
    statusCode: result.approvalRequired ? httpStatus.ACCEPTED : httpStatus.CREATED,
    success: true,
    message: result.approvalRequired
      ? "Stock intake submitted for Super Admin approval"
      : "Stock received successfully",
    data: result.data,
  });
});

const stockOut = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await ApprovalInterceptor.executeOrIntercept({
    permissionCode: "stock.out",
    entityType: ApprovalEntityType.STOCK_ADJUSTMENT,
    action: "OUT",
    user,
    payload: req.body,
    summary: `Stock Out write-off for item '${req.body.inventoryItemId}', qty: ${req.body.quantity}`,
    executeDirectly: () => StockService.stockOut(req.body, req.file, user.id),
  });

  sendResponse(res, {
    statusCode: result.approvalRequired ? httpStatus.ACCEPTED : httpStatus.OK,
    success: true,
    message: result.approvalRequired
      ? "Stock write-off submitted for Super Admin approval"
      : "Stock issued / written-off successfully",
    data: result.data,
  });
});

const transferStock = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await ApprovalInterceptor.executeOrIntercept({
    permissionCode: "stock.transfer",
    entityType: ApprovalEntityType.STOCK_TRANSFER,
    action: "TRANSFER",
    user,
    payload: req.body,
    summary: `Stock transfer from location '${req.body.fromLocationId}' to '${req.body.toLocationId}'`,
    executeDirectly: () => StockService.transferStock(req.body, req.file, user.id),
  });

  sendResponse(res, {
    statusCode: result.approvalRequired ? httpStatus.ACCEPTED : httpStatus.OK,
    success: true,
    message: result.approvalRequired
      ? "Stock transfer submitted for Super Admin approval"
      : "Stock transferred successfully",
    data: result.data,
  });
});

const adjustStock = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await ApprovalInterceptor.executeOrIntercept({
    permissionCode: "stock.adjust",
    entityType: ApprovalEntityType.STOCK_ADJUSTMENT,
    action: "ADJUST",
    user,
    payload: req.body,
    summary: `Stock adjustment for item '${req.body.inventoryItemId}' at location '${req.body.locationId}', actualQty: ${req.body.actualQuantity}`,
    executeDirectly: () => StockService.adjustStock(req.body, req.file, user.id),
  });

  sendResponse(res, {
    statusCode: result.approvalRequired ? httpStatus.ACCEPTED : httpStatus.OK,
    success: true,
    message: result.approvalRequired
      ? "Stock adjustment submitted for Super Admin approval"
      : "Stock adjusted and reconciled successfully",
    data: result.data,
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
