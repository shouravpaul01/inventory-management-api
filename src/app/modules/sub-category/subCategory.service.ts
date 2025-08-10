import httpStatus from "http-status";
import { TSubCategory } from "./subCategory.interface";
import { SubCategory } from "./subCategory.model";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import { JwtPayload } from "jsonwebtoken";


const logEvent = (
  eventType: string,
  performedBy: string,
  comments?: string
) => ({
  eventType,
  performedBy,
  comments,
  performedAt: new Date(),
});

const createSubCategoryIntoDB = async (
  payload: TSubCategory,
  user: JwtPayload
) => {
  if (await SubCategory.isSubCatNameExists(payload.name)) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "name",
      "Name already exists."
    );
  }

  const result = await SubCategory.create({
    ...payload,
    eventsHistory: [
      logEvent("created", user.faculty, "Sub-category created"),
    ],
  });
  return result;
};

const getAllSubCategoriesDB = async (query: Record<string, unknown>) => {
  const searchableFields = ["name"];
  const mainQuery = new QueryBuilder(
    SubCategory.find({}).populate("category"),
    query
  )
    .filter()
    .search(searchableFields);

  const totalPages = (await mainQuery.totalPages()).totalQuery;
  const subCategoryQuery = mainQuery.paginate();
  const subCategories = await subCategoryQuery.modelQuery;

  return { data: subCategories, totalPages };
};

const getSingleSubCategoryDB = async (subCategoryId: string) => {
  const result = await SubCategory.findById(subCategoryId).populate("category").populate("eventsHistory.performedBy");
  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "subCategoryError",
      "Sub Category not found."
    );
  }
  return result;
};

const updateSubCategoryIntoDB = async (
  subCategoryId: string,
  payload: Partial<TSubCategory>,
  user: JwtPayload
) => {
  const result = await SubCategory.findByIdAndUpdate(
    subCategoryId,
    {
      ...payload,
      $push: {
        eventsHistory: logEvent("updated", user.faculty, "Sub-category updated"),
      },
    },
    { new: true }
  );
  return result;
};

const updateSubCategoryStatusDB = async (
  subCategoryId: string,
  isActive: string,
  user: JwtPayload
) => {
  try {
    const statusType = isActive=="true" ? "activated" : "deactivated";

  const result = await SubCategory.findByIdAndUpdate(
    subCategoryId,
    {
      isActive,
      $push: {
        eventsHistory: logEvent(statusType, user.faculty, `Sub-category ${statusType}`),
      },
    },
    { new: true }
  );



  return result;
  } catch (error) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "subCategoryError",
      "Failed to update status."
    );
  }
};

const updateSubCategoryApprovedStatusDB = async (
  user: JwtPayload,
  subCategoryId: string
) => {
 try {
  const subCat = await SubCategory.findById(subCategoryId);
  if (!subCat) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "subCategoryError",
      "Sub Category does not exist."
    );
  }

  const result = await SubCategory.findByIdAndUpdate(
    subCategoryId,
    {
      isApproved: true,
      isActive: true,
      $push: {
        eventsHistory: logEvent("approved", user.faculty, "Sub-category approved"),
      },
    },
    { new: true }
  );

  return result;
 } catch (error) {
  throw new AppError(
    httpStatus.INTERNAL_SERVER_ERROR,
    "subCategoryError",
    "Failed to update approval status."
  );
 }
};

const getAllActiveSubCategoriesByCategoryDB = async (categoryId: string) => {
  const result = await SubCategory.find({
    category: categoryId,
    isActive: true,
    isApproved: true,
  });

  return result;
};

export const SubCatServices = {
  createSubCategoryIntoDB,
  getAllSubCategoriesDB,
  getSingleSubCategoryDB,
  updateSubCategoryIntoDB,
  updateSubCategoryStatusDB,
  updateSubCategoryApprovedStatusDB,
  getAllActiveSubCategoriesByCategoryDB,
};
