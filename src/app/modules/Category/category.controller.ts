import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { CategoryService } from "./category.service";

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user?.id;
  const result = await CategoryService.createCategory(req.body, actorId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Category created successfully",
    data: result,
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
  const actorId = req.user?.id;
  const result = await CategoryService.updateCategory(id, req.body, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category updated successfully",
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const actorId = req.user?.id;
  const result = await CategoryService.deleteCategory(id, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
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
