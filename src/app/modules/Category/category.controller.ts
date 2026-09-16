import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { CategoryService } from "./category.service";
import { ApprovalInterceptor } from "../Approval/approval.interceptor";
import { ApprovalEntityType } from "@prisma/client";

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await ApprovalInterceptor.executeOrIntercept({
    permissionCode: "category.create",
    entityType: ApprovalEntityType.CATEGORY,
    action: "CREATE",
    user,
    payload: req.body,
    summary: `Create Category '${req.body.name}' (${req.body.code})`,
    executeDirectly: () => CategoryService.createCategory(req.body, user.id),
  });

  sendResponse(res, {
    statusCode: result.approvalRequired ? httpStatus.ACCEPTED : httpStatus.CREATED,
    success: true,
    message: result.approvalRequired
      ? "Category creation submitted for Super Admin approval"
      : "Category created successfully",
    data: result.data,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getAllCategories(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Categories retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getCategoryTree = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getCategoryTree();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category hierarchy tree retrieved successfully",
    data: result,
  });
});

const getCategoryById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await CategoryService.getCategoryById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category details retrieved successfully",
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = req.user!;
  const result = await ApprovalInterceptor.executeOrIntercept({
    permissionCode: "category.update",
    entityType: ApprovalEntityType.CATEGORY,
    action: "UPDATE",
    entityId: id,
    user,
    payload: req.body,
    summary: `Update Category details for '${id}'`,
    executeDirectly: () => CategoryService.updateCategory(id, req.body, user.id),
  });

  sendResponse(res, {
    statusCode: result.approvalRequired ? httpStatus.ACCEPTED : httpStatus.OK,
    success: true,
    message: result.approvalRequired
      ? "Category update submitted for Super Admin approval"
      : "Category updated successfully",
    data: result.data,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = req.user!;
  const result = await ApprovalInterceptor.executeOrIntercept({
    permissionCode: "category.delete",
    entityType: ApprovalEntityType.CATEGORY,
    action: "DELETE",
    entityId: id,
    user,
    payload: {},
    summary: `Delete Category '${id}'`,
    executeDirectly: () => CategoryService.deleteCategory(id, user.id),
  });

  sendResponse(res, {
    statusCode: result.approvalRequired ? httpStatus.ACCEPTED : httpStatus.OK,
    success: true,
    message: result.approvalRequired
      ? "Category deletion submitted for Super Admin approval"
      : "Category deleted successfully",
    data: result.data,
  });
});

export const CategoryController = {
  createCategory,
  getAllCategories,
  getCategoryTree,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
