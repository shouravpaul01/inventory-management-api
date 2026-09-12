import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { UserService } from "./user.service";

const createUser = catchAsync(async (req: Request, res: Response) => {
  const creatorId = req.user?.id;
  const result = await UserService.createUser(req.body, creatorId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User created successfully",
    data: result,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getAllUsers(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const result = await UserService.getUserById(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User details retrieved successfully",
    data: result,
  });
});

const updateUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const result = await UserService.updateUser(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User updated successfully",
    data: result,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const result = await UserService.updateUserStatus(
    userId,
    req.body.status
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User status updated successfully",
    data: result,
  });
});

const assignUserRoles = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const assignedById = req.user?.id;
  const result = await UserService.assignUserRoles(
    userId,
    req.body.roleIds,
    assignedById
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User roles assigned successfully",
    data: result,
  });
});

const overrideUserPermissions = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.params.id as string;
    const assignedById = req.user?.id;
    const result = await UserService.overrideUserPermissions(
      userId,
      req.body.overrides,
      assignedById
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User permissions overridden successfully",
      data: result,
    });
  }
);

export const UserController = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  assignUserRoles,
  overrideUserPermissions,
};