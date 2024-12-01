import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { SubCatServices } from "./subCategory.service";
import sendResponse from "../../utils/sendResponse";

const createSubCategoryInto = catchAsync(async (req, res) => {
  const result = await SubCatServices.createSubCategoryIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Sub Category created successfully.",
    data: result,
  });
});
const getAllSubCategories = catchAsync(async (req, res) => {
  const result = await SubCatServices.getAllSubCategoriesDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully retrived all sub categories.",
    data: result,
  });
});
const getSingleSubCategory = catchAsync(async (req, res) => {
  const { subCategoryId } = req.params;
  const result = await SubCatServices.getSingleSubCategoryDB(subCategoryId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully retrieved the sub category.",
    data: result,
  });
});
const updateSubCategoryInto = catchAsync(async (req, res) => {
  const { subCategoryId } = req.params;
  const result = await SubCatServices.updateSubCategoryIntoDB(
    subCategoryId,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Sub Category updated successfully.",
    data: result,
  });
});
const updateSubCategoryStatus = catchAsync(async (req, res) => {
  const { subCategoryId } = req.params;
  const { isActive } = req.query;
  console.log(subCategoryId)
  const result = await SubCatServices.updateSubCategoryStatusDB(
    subCategoryId,
    isActive as unknown as boolean
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${result?.isActive?"Category inactivation was successful.":"Category activation was successful."}`,
    data: result,
  });
});
const updateSubCategoryApprovedStatus = catchAsync(async (req, res) => {
  const { subCategoryId } = req.params;

  const result = await SubCatServices.updateSubCategoryApprovedStatusDB(
    subCategoryId
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Sub Category approval successful.",
    data: result,
  });
});
const getAllActiveSubCategoriesByCategory = catchAsync(async (req, res) => {
  const {categoryId}=req.params
  console.log(categoryId,"dd")
  const result = await SubCatServices.getAllActiveSubCategoriesByCategoryDB(categoryId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully fetched all active sub categories.",
    data: result,
  });
});
export const SubCatControllers = {
  createSubCategoryInto,
  getAllSubCategories,
  getSingleSubCategory,
  updateSubCategoryInto,
  updateSubCategoryStatus,
  updateSubCategoryApprovedStatus,
  getAllActiveSubCategoriesByCategory,
};
