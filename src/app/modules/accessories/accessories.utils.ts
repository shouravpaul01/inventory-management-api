import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { TCategory } from "../category/category.interface";
import { SubCategory } from "../sub-category/subCategory.model";
import { Types } from "mongoose";
import { Accessory } from "./accessories.modal";

export const generateAccessoryCodeTitle = async (
  subCategoryId: Types.ObjectId,
  codeTitle: string
) => {
  const isSubCatExists = await SubCategory.findById(subCategoryId).populate(
    "category"
  );
  if (!isSubCatExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "accessoryError",
      "Accessory creation failed. Please try again."
    );
  }
  const codeFormet = `CSE-${isSubCatExists?.name
    .substring(0, 4)
    .toUpperCase()}-${codeTitle.toUpperCase()}`;
  const isCodeTitleExists = await Accessory.findOne({ codeTitle: codeFormet });
  if (isCodeTitleExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "codeTitle",
      "Code title already exists."
    );
  }
  return codeFormet;
};
export const generateAccessoriesCode = async (
  {totalQuantity,quantity,
  codeTitle}:{totalQuantity?:number,quantity: number,
    codeTitle: string}
  ) => {
    const allCodes= [];
    const quantityLength=totalQuantity?totalQuantity+quantity: quantity
  for (let i = totalQuantity?totalQuantity+1:1; i <=quantityLength ; i++) {
    const code = `${codeTitle}-${String(i).padStart(4, '0')}`;
    allCodes.push(code);
  }

  // Save the generated codeTitles to the accessory
  return allCodes;
  };