import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { AuditService } from "./audit.service";

const getAllAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await AuditService.getAllAuditLogs(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Audit logs retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAuditLogById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await AuditService.getAuditLogById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Audit log retrieved successfully",
    data: result,
  });
});

export const AuditController = {
  getAllAuditLogs,
  getAuditLogById,
};
