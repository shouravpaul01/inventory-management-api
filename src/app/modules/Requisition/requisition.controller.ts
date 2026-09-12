import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { RequisitionService } from "./requisition.service";
import { IAuthUser } from "../../../interfaces";

const createRequisition = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IAuthUser;
  const result = await RequisitionService.createRequisition(req.body, user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Draft requisition created successfully",
    data: result,
  });
});

const updateRequisition = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IAuthUser;
  const id = req.params.id as string;
  const result = await RequisitionService.updateRequisition(id, req.body, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Requisition updated successfully",
    data: result,
  });
});

const submitRequisition = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IAuthUser;
  const id = req.params.id as string;
  const result = await RequisitionService.submitRequisition(id, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.requiresApproval
      ? "Requisition submitted and routed to approval workflow"
      : "Requisition submitted successfully",
    data: result,
  });
});

const reviewRequisition = catchAsync(async (req: Request, res: Response) => {
  const reviewer = req.user as IAuthUser;
  const id = req.params.id as string;
  const result = await RequisitionService.reviewRequisition(id, req.body, reviewer);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Requisition review completed (${result.status})`,
    data: result,
  });
});

const cancelRequisition = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IAuthUser;
  const id = req.params.id as string;
  const result = await RequisitionService.cancelRequisition(id, req.body.reason, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Requisition cancelled successfully",
    data: result,
  });
});

const getRequisitionById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await RequisitionService.getRequisitionById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Requisition details retrieved successfully",
    data: result,
  });
});

const getAllRequisitions = catchAsync(async (req: Request, res: Response) => {
  const result = await RequisitionService.getAllRequisitions(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Requisitions retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const deleteRequisition = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IAuthUser;
  const id = req.params.id as string;
  const result = await RequisitionService.deleteRequisition(id, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const RequisitionController = {
  createRequisition,
  updateRequisition,
  submitRequisition,
  reviewRequisition,
  cancelRequisition,
  getRequisitionById,
  getAllRequisitions,
  deleteRequisition,
};
