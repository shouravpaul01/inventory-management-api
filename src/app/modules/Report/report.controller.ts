import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ReportService } from "./report.service";
import { IAuthUser } from "../../../interfaces";

const getDashboardOverview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getDashboardOverview();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard summary retrieved successfully",
    data: result,
  });
});

const getLowStockReport = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getLowStockReport();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Low stock monitor report retrieved successfully",
    data: result,
  });
});

const getUserAssignedAssets = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const result = await ReportService.getUserAssignedAssets(userId, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User assigned assets retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMyAssignedAssets = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IAuthUser;
  const result = await ReportService.getUserAssignedAssets(user.id, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My assigned assets retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getOverdueReturnsReport = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getOverdueReturnsReport();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Overdue returns report retrieved successfully",
    data: result,
  });
});

const getMovementLedger = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getMovementLedger(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Movement ledger retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const ReportController = {
  getDashboardOverview,
  getLowStockReport,
  getUserAssignedAssets,
  getMyAssignedAssets,
  getOverdueReturnsReport,
  getMovementLedger,
};
