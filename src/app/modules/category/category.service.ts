import httpStatus from "http-status";
import { Category } from "./category.model";
import { TCategory } from "./category.interface";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";

const createCategoryIntoDB = async (payload: TCategory) => {
  if (await Category.isCategoryNameExists(payload.name)) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY,"name","Name already exists."); 
  }
  if (await Category.isCategoryCodeExists(payload.code)){
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY,"code","Code already exists."); 
  }
  const result = await Category.create(payload);
  return result;
};
const getAllCategoriesDB = async (query: Record<string, unknown>) => {
 const searchableFields=["name","code"]
  const mainQuery = new QueryBuilder(Category.find({}), query).search(
    searchableFields
  );

  const totalPages = (await mainQuery.totalPages()).totalQuery;
  const categoryQuery = mainQuery.paginate();
  const categories = await categoryQuery.modelQuery;

  const result = { data: categories, totalPages: totalPages };
  return result;
};
const getSingleCategoryDB = async (
  categoryId: string
) => {
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
const updateCategoryStatusDB = async (categoryId: string, isActive: boolean) => {
  
  const result = await Category.findByIdAndUpdate(
    categoryId,
    { isActive: isActive },
    { new: true }
  );
  return result;
};
const getAllActiveCategoriesDB = async () => {
  const result = await Category.find({ isActive: true });
  return result;
};
export const CategoryServices = {
  createCategoryIntoDB,
  getAllCategoriesDB,
  getSingleCategoryDB,
  updateCategoryIntoDB,
  updateCategoryStatusDB,
  getAllActiveCategoriesDB,
};
