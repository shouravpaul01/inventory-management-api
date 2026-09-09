import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { NotificationService } from "./notification.service";
import { IAuthUser } from "../../../interfaces";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IAuthUser;
  const result = await NotificationService.getMyNotifications(user.id, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notifications retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IAuthUser;
  const id = req.params.id as string;
  const result = await NotificationService.markAsRead(id, user.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification marked as read",
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IAuthUser;
  const result = await NotificationService.markAllAsRead(user.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

export const NotificationController = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
