import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";

import sendResponse from "../../utils/sendResponse";
import { CategoryServices } from "./category.service";

const createCategoryInto = catchAsync(async (req, res) => {
    const result = await CategoryServices.createCategoryIntoDB(req.body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Category added successfully",
      data: result,
    });
  });
  const getAllCategories = catchAsync(async (req, res) => { 
    const result = await CategoryServices.getAllCategoriesDB(req.query);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Successfully retrived all categories.",
      data: result,
    });
  });
  const getSingleCategory = catchAsync(async (req, res) => {
    console.log('single')
    const { categoryId } = req.params;
    const result = await CategoryServices.getSingleCategoryDB(categoryId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Successfully retrieved the category.",
      data: result,
    });
  });
  const updateCategoryInto = catchAsync(async (req, res) => {
    const { categoryId } = req.params;
    console.log(categoryId,req.body)
    const result = await CategoryServices.updateCategoryIntoDB(categoryId, req.body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Category updated successfully.",
      data: result,
    });
  });
  const updateCategoryStatus = catchAsync(async (req, res) => {
    const { categoryId } = req.params;
    const { isActive } = req.query;
    const result = await CategoryServices.updateCategoryStatusDB(
      categoryId,
      isActive as unknown as boolean
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `${result?.isActive?"Successfully Deactivated.":"Successfully Activated."}`,
      data: result,
    });
  });
  const getAllActiveCategories = catchAsync(async (req, res) => {
    const result = await CategoryServices.getAllActiveCategoriesDB()
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Successfully fetched all active categories.",
      data: result,
    });
  });
  export const CategoryControllers = {
   createCategoryInto,
   getAllCategories,
   getSingleCategory,
   updateCategoryInto,
   updateCategoryStatus,
   getAllActiveCategories
  };
  