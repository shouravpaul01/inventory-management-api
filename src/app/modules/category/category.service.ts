import httpStatus from "http-status";
import { Category } from "./category.model";
import { TCategory } from "./category.interface";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import { JwtPayload } from "jsonwebtoken";

const createCategoryIntoDB = async (payload: TCategory) => {
  if (await Category.isCategoryNameExists(payload.name)) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "name",
      "Name already exists."
    );
  }

  const result = await Category.create(payload);
  return result;
};
const getAllCategoriesDB = async (query: Record<string, unknown>) => {
  const searchableFields = ["name", "code"];
  const mainQuery = new QueryBuilder(Category.find({}), query)
    .filter()
    .search(searchableFields);

  const totalPages = (await mainQuery.totalPages()).totalQuery;
  const categoryQuery = mainQuery.paginate();
  const categories = await categoryQuery.modelQuery;

  const result = { data: categories, totalPages: totalPages };
  return result;
};
const getSingleCategoryDB = async (categoryId: string) => {
  const result = await Category.findById(categoryId);
  return result;
};
const updateCategoryIntoDB = async (
  categoryId: string,
  payload: Partial<TCategory>
) => {
  const result = await Category.findByIdAndUpdate(categoryId, payload, {
    new: true,
  });
  return result;
};
const updateCategoryStatusDB = async (
  categoryId: string,
  isActive: boolean
) => {
  const isCategoryExists = await Category.findById(categoryId);
  if (!isCategoryExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "categoryError",
      "Category does not exist."
    );
  }
  const result = await Category.findByIdAndUpdate(
    categoryId,
    { isActive: isActive },
    { new: true }
  );
  return result;
};
const updateCategoryApprovedStatusDB = async (
  user: JwtPayload,
  categoryId: string
) => {
  const isCategoryExists = await Category.findById(categoryId);
  if (!isCategoryExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "categoryError",
      "Category does not exist."
    );
  }
  const result = await Category.findByIdAndUpdate(
    categoryId,
    {
      "approvalDetails.isApproved": true,
      "approvalDetails.approvedBy": user._id,
      "approvalDetails.approvedDate": new Date(),
      isActive: true,
    },
    { new: true }
  );
  return result;
};

const getCategoriesWithSubCategoriesDB = async () => {
  const result = await Category.find({
    isActive: true,
    "approvalDetails.isApproved": true,
  }).populate({
    path: "subCategories",
    match: { isActive: true, "approvalDetails.isApproved": true },
    select: "name isActive",
  });
  return result;
};
export const CategoryServices = {
  createCategoryIntoDB,
  getAllCategoriesDB,
  getSingleCategoryDB,
  updateCategoryIntoDB,
  updateCategoryStatusDB,
  updateCategoryApprovedStatusDB,
  getCategoriesWithSubCategoriesDB,
};
