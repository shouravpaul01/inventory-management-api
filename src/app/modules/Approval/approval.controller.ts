import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import ApiError from "../../../errors/ApiErrors";
import { ApprovalService } from "./approval.service";

const getAllApprovalRequests = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user!;
    const query: Record<string, unknown> = { ...req.query };

    // Check if user has global approval review rights
    const hasGlobalView =
      user.isSuperAdmin ||
      user.permissions?.includes("approval.view") ||
      user.permissions?.includes("requisition.approve");

    // Regular users can only view their own submissions
    if (!hasGlobalView) {
      query.requestedById = user.id;
    }

    const result = await ApprovalService.getAllApprovalRequests(query);

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
    const user = req.user!;
    const result = await ApprovalService.getApprovalRequestById(requestId);

    const hasGlobalView =
      user.isSuperAdmin ||
      user.permissions?.includes("approval.view") ||
      user.permissions?.includes("requisition.approve");

    if (!hasGlobalView && result.requestedById !== user.id) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You do not have permission to view this approval request"
      );
    }

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

const resubmitApprovalRequest = catchAsync(
  async (req: Request, res: Response) => {
    const requestId = req.params.id as string;
    const user = req.user!;
    const result = await ApprovalService.resubmitApprovalRequest(
      requestId,
      user,
      req.body
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Approval request corrected and resubmitted successfully for Super Admin review",
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

const getExemptionSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await ApprovalService.getExemptionSummary();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Approval exemption summary retrieved successfully",
    data: result,
  });
});

export const ApprovalController = {
  getAllApprovalRequests,
  getApprovalRequestById,
  actionApprovalRequest,
  resubmitApprovalRequest,
  createPolicy,
  getAllPolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy,
  getExemptionSummary,
};
