import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { RbacService } from "./rbac.service";

const getAllRoles = catchAsync(async (req: Request, res: Response) => {
  const result = await RbacService.getAllRoles(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Roles fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getRoleById = catchAsync(async (req: Request, res: Response) => {
  const roleId = req.params.id as string;
  const result = await RbacService.getRoleById(roleId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Role details fetched successfully",
    data: result,
  });
});

const createRole = catchAsync(async (req: Request, res: Response) => {
  const result = await RbacService.createRole(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Role created successfully",
    data: result,
  });
});

const updateRole = catchAsync(async (req: Request, res: Response) => {
  const roleId = req.params.id as string;
  const result = await RbacService.updateRole(roleId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Role updated successfully",
    data: result,
  });
});

const deleteRole = catchAsync(async (req: Request, res: Response) => {
  const roleId = req.params.id as string;
  const result = await RbacService.deleteRole(roleId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const getAllPermissions = catchAsync(async (req: Request, res: Response) => {
  const result = await RbacService.getAllPermissions(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Permissions fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const assignRolePermissions = catchAsync(async (req: Request, res: Response) => {
  const roleId = req.params.id as string;
  const result = await RbacService.assignRolePermissions(
    roleId,
    req.body.permissionIds
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Role permissions updated successfully",
    data: result,
  });
});

export const RbacController = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions,
  assignRolePermissions,
};
