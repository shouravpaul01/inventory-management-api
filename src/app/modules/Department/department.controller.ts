import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { DepartmentService } from "./department.service";

const createDepartment = catchAsync(async (req: Request, res: Response) => {
  const creatorId = req.user?.id;
  const result = await DepartmentService.createDepartment(req.body, creatorId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Department created successfully",
    data: result,
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
  const actorId = req.user?.id;
  const result = await DepartmentService.updateDepartment(deptId, req.body, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Department updated successfully",
    data: result,
  });
});

const deleteDepartment = catchAsync(async (req: Request, res: Response) => {
  const deptId = req.params.id as string;
  const actorId = req.user?.id;
  const result = await DepartmentService.deleteDepartment(deptId, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const DepartmentController = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
};
