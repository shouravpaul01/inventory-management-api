import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ReturnService } from "./return.service";
import { IAuthUser } from "../../../interfaces";

const processReturn = catchAsync(async (req: Request, res: Response) => {
  const processor = req.user as IAuthUser;
  const result = await ReturnService.processReturn(req.body, req.file, processor);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Return transaction processed successfully",
    data: result,
  });
});

const getReturnById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ReturnService.getReturnById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Return transaction details retrieved successfully",
    data: result,
  });
});

const getAllReturns = catchAsync(async (req: Request, res: Response) => {
  const result = await ReturnService.getAllReturns(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Return transactions retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const ReturnController = {
  processReturn,
  getReturnById,
  getAllReturns,
};
