import httpStatus from "http-status";
import { Category } from "./category.model";
import { TCategory } from "./category.interface";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import { JwtPayload } from "jsonwebtoken";
import { Types } from "mongoose";

const logEvent = (
  type: "created" | "updated" | "approved" | "activated" | "deactivated",
  performedBy: Types.ObjectId,
  comments?: string
) => ({
  eventType: type,
  performedBy,
  performedAt: new Date(),
  comments,
});

const createCategoryIntoDB = async (payload: TCategory, user: JwtPayload) => {
  if (await Category.isCategoryNameExists(payload.name)) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "name",
      "Name already exists."
    );
  }
  payload.eventsHistory = [logEvent("created", user.faculty, "Category created")];
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
  payload: Partial<TCategory>,
  user: JwtPayload
) => {
  const isCategoryExists=await Category.findById(categoryId)
  if (!isCategoryExists) {
    throw new AppError(httpStatus.NOT_FOUND,"categoryError","Category does not exists.")
  }
 
  const updateWithEvent = {
    ...payload,
    $push: {
      eventsHistory: logEvent("updated",user.faculty, "Room updated"),
    },
  };
  const result = await Category.findByIdAndUpdate(categoryId, updateWithEvent, {
    new: true,
  });
  return result;
};
const updateCategoryStatusDB = async (
  categoryId: string,
  isActive: string,
  user: JwtPayload
) => {
  try {
    const isCategoryExists = await Category.findById(categoryId);

    if (!isCategoryExists) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "categoryError",
        "Category does not exist."
      );
    }

    const statusType = isActive === "true" ? "activated" : "deactivated";
    const activeStatus = isActive === "true";

    const result = await Category.findByIdAndUpdate(
      categoryId,
      {
        isActive: activeStatus,
        $push: {
          eventsHistory: logEvent(statusType, user.faculty, `Category ${statusType}`),
        },
      },
      { new: true }
    );

    return result;
  } catch (error) {
    
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "categoryError",
      "Failed to update category status."
    );
  }
};

const updateCategoryApprovedStatusDB = async (
  user: JwtPayload,
  categoryId: string
) => {
  try {
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
      isApproved: true,
      isActive: true,
      $push: { eventsHistory: logEvent("approved", user.faculty, "Category approved")}
    },
    { new: true }
  );
  return result;
  } catch (error) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "categoryError",
      "Failed to update approval status."
    );
  
  }
};

const getCategoriesWithSubCategoriesDB = async () => {
  const result = await Category.find({
    isActive: true,
    isApproved: true,
  }).populate({
    path: "subCategories",
    match: { isActive: true, isApproved: true },
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
