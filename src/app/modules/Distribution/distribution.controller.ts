import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { DistributionService } from "./distribution.service";
import { IAuthUser } from "../../../interfaces";

const createDistribution = catchAsync(async (req: Request, res: Response) => {
  const issuer = req.user as IAuthUser;
  const result = await DistributionService.createDistribution(req.body, issuer);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Inventory distributed successfully",
    data: result,
  });
});

const confirmDelivery = catchAsync(async (req: Request, res: Response) => {
  const actor = req.user as IAuthUser;
  const id = req.params.id as string;
  const result = await DistributionService.confirmDelivery(id, req.body, req.file, actor);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Delivery confirmed successfully",
    data: result,
  });
});

const getDistributionById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await DistributionService.getDistributionById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Distribution details retrieved successfully",
    data: result,
  });
});

const getAllDistributions = catchAsync(async (req: Request, res: Response) => {
  const result = await DistributionService.getAllDistributions(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Distributions retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const DistributionController = {
  createDistribution,
  confirmDelivery,
  getDistributionById,
  getAllDistributions,
};
