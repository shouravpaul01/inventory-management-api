import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { DepartmentService } from "./department.service";
import { ApprovalInterceptor } from "../Approval/approval.interceptor";
import { ApprovalEntityType } from "@prisma/client";

const createDepartment = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await ApprovalInterceptor.executeOrIntercept({
    permissionCode: "department.create",
    entityType: ApprovalEntityType.DEPARTMENT,
    action: "CREATE",
    user,
    payload: req.body,
    summary: `Create Department '${req.body.name}' (${req.body.code})`,
    executeDirectly: () => DepartmentService.createDepartment(req.body, user.id),
  });

  sendResponse(res, {
    statusCode: result.approvalRequired ? httpStatus.ACCEPTED : httpStatus.CREATED,
    success: true,
    message: result.approvalRequired
      ? "Department creation submitted for Super Admin approval"
      : "Department created successfully",
    data: result.data,
  });
});

const getAllDepartments = catchAsync(async (req: Request, res: Response) => {
  const result = await DepartmentService.getAllDepartments(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Departments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getDepartmentById = catchAsync(async (req: Request, res: Response) => {
  const deptId = req.params.id as string;
  const result = await DepartmentService.getDepartmentById(deptId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Department details retrieved successfully",
    data: result,
  });
});

const updateDepartment = catchAsync(async (req: Request, res: Response) => {
  const deptId = req.params.id as string;
  const user = req.user!;
  const result = await ApprovalInterceptor.executeOrIntercept({
    permissionCode: "department.update",
    entityType: ApprovalEntityType.DEPARTMENT,
    action: "UPDATE",
    entityId: deptId,
    user,
    payload: req.body,
    summary: `Update Department details for '${deptId}'`,
    executeDirectly: () => DepartmentService.updateDepartment(deptId, req.body, user.id),
  });

  sendResponse(res, {
    statusCode: result.approvalRequired ? httpStatus.ACCEPTED : httpStatus.OK,
    success: true,
    message: result.approvalRequired
      ? "Department update submitted for Super Admin approval"
      : "Department updated successfully",
    data: result.data,
  });
});

const deleteDepartment = catchAsync(async (req: Request, res: Response) => {
  const deptId = req.params.id as string;
  const user = req.user!;
  const result = await ApprovalInterceptor.executeOrIntercept({
    permissionCode: "department.delete",
    entityType: ApprovalEntityType.DEPARTMENT,
    action: "DELETE",
    entityId: deptId,
    user,
    payload: {},
    summary: `Delete Department '${deptId}'`,
    executeDirectly: () => DepartmentService.deleteDepartment(deptId, user.id),
  });

  sendResponse(res, {
    statusCode: result.approvalRequired ? httpStatus.ACCEPTED : httpStatus.OK,
    success: true,
    message: result.approvalRequired
      ? "Department deletion submitted for Super Admin approval"
      : "Department deleted successfully",
    data: result.data,
  });
});

export const DepartmentController = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
};
