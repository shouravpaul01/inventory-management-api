import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ApprovalService } from "./approval.service";

const getAllApprovalRequests = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ApprovalService.getAllApprovalRequests(req.query);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Approval requests retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  }
);

const getApprovalRequestById = catchAsync(
  async (req: Request, res: Response) => {
    const requestId = req.params.id as string;
    const result = await ApprovalService.getApprovalRequestById(requestId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Approval request details retrieved successfully",
      data: result,
    });
  }
);

const actionApprovalRequest = catchAsync(
  async (req: Request, res: Response) => {
    const requestId = req.params.id as string;
    const user = req.user!;
    const result = await ApprovalService.actionApprovalRequest(
      requestId,
      user,
      req.body
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Approval request ${req.body.decision.toLowerCase()}d successfully`,
      data: result,
    });
  }
);

const createPolicy = catchAsync(async (req: Request, res: Response) => {
  const creatorId = req.user?.id;
  const result = await ApprovalService.createPolicy(req.body, creatorId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Approval policy created successfully",
    data: result,
  });
});

const getAllPolicies = catchAsync(async (req: Request, res: Response) => {
  const result = await ApprovalService.getAllPolicies(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Approval policies retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getPolicyById = catchAsync(async (req: Request, res: Response) => {
  const policyId = req.params.id as string;
  const result = await ApprovalService.getPolicyById(policyId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Approval policy details retrieved successfully",
    data: result,
  });
});

const updatePolicy = catchAsync(async (req: Request, res: Response) => {
  const policyId = req.params.id as string;
  const result = await ApprovalService.updatePolicy(policyId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Approval policy updated successfully",
    data: result,
  });
});

const deletePolicy = catchAsync(async (req: Request, res: Response) => {
  const policyId = req.params.id as string;
  const result = await ApprovalService.deletePolicy(policyId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const ApprovalController = {
  getAllApprovalRequests,
  getApprovalRequestById,
  actionApprovalRequest,
  createPolicy,
  getAllPolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy,
};
