import httpStatus from "http-status";
import { TSubCategory } from "./subCategory.interface";
import { SubCategory } from "./subCategory.model";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";


const createSubCategoryIntoDB = async (payload: TSubCategory) => {
  if (await SubCategory.isSubCatNameExists(payload.name)) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "name",
      "Name already exists."
    );
  }
  if (await SubCategory.isSubCatCodeExists(payload.code)) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "code",
      "Code already exists."
    );
  }
  const result = await SubCategory.create(payload);
  return result;
};
const getAllSubCategoriesDB = async (query: Record<string, unknown>) => {
  const searchableFields = ["name", "code"];
  const mainQuery = new QueryBuilder(
    SubCategory.find({}).populate("category"),
    query
  ).search(searchableFields);

  const totalPages = (await mainQuery.totalPages()).totalQuery;
  const subCategoryQuery = mainQuery.paginate();
  const subCategories = await subCategoryQuery.modelQuery;

  const result = { data: subCategories, totalPages: totalPages };
  return result;
};
const getSingleSubCategoryDB = async (subCategoryId: string) => {
  const result = await SubCategory.findById(subCategoryId);
  return result;
};
const updateSubCategoryIntoDB = async (
  subCategoryId: string,
  payload: Partial<TSubCategory>
) => {
  const result = await SubCategory.findByIdAndUpdate(subCategoryId, payload, {
    new: true,
  });
  return result;
};
const updateSubCategoryStatusDB = async (
  subCategoryId: string,
  isActive: boolean
) => {
console.log(subCategoryId)
  const result = await SubCategory.findByIdAndUpdate(
    subCategoryId,
    { isActive: isActive },
    { new: true }
  );
  return result;
};
const getAllActiveSubCategoriesDB = async () => {
  const result = await SubCategory.find({ isActive: true });
  return result;
};
export const SubCatServices = {
  createSubCategoryIntoDB,
  getAllSubCategoriesDB,
  getSingleSubCategoryDB,
  updateSubCategoryIntoDB,
  updateSubCategoryStatusDB,
  getAllActiveSubCategoriesDB,
};
