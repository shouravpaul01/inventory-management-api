import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { TAccessory } from "./accessories.interface";
import { Accessory } from "./accessories.modal";
import { TFileUpload } from "../../interfaces";
import {
  generateAccessoriesCode,
  generateAccessoryCodeTitle,
} from "./accessories.utils";
import { QueryBuilder } from "../../builder/QueryBuilder";
import { deleteFileFromCloudinary } from "../../utils/deleteFileFromCloudinary";

const createAccessoryIntoDB = async (
  file: TFileUpload,
  payload: TAccessory & { codeTitle: string; quantity: number }
) => {
  const isAccessoryExists = await Accessory.findOne({ name: payload.name });
  if (isAccessoryExists) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "name",
      "Name already exists."
    );
  }
  if (file) {
    payload.image = file.path;
  }
  if (!payload.quantityDetails) {
    payload.quantityDetails = {
      totalQuantity: 0,
      currentQuantity: 0,
    };
  }
  const codeTitle = await generateAccessoryCodeTitle(
    payload.subCategory,
    payload.codeTitle
  );
  const codes = await generateAccessoriesCode({
    quantity: payload.quantity as number,
    codeTitle,
  });
  if (!payload.codeDetails) {
    payload.codeDetails = {
      codeTitle: codeTitle,
      totalCodes: [],
      currentCodes: [],
    };
  }

  payload.quantityDetails.totalQuantity = payload.quantity;
  payload.quantityDetails.currentQuantity = payload.quantity;
  payload.codeDetails.totalCodes = codes;
  payload.codeDetails.currentCodes = codes;

  const result = await Accessory.create(payload);
  return result;
};
const getAllAccessoriesDB = async (query: Record<string, unknown>) => {
  const searchableFields = ["name"];
  const mainQuery = new QueryBuilder(
    Accessory.find({}).populate("category").populate("subCategory"),
    query
  )
    .filter()
    .search(searchableFields);

  const totalPages = (await mainQuery.totalPages()).totalQuery;
  const paginateQuery = mainQuery.paginate();
  const accessories = await paginateQuery.modelQuery;

  const result = { data: accessories, totalPages: totalPages };
  return result;
};
const getSingleAccessoryDB = async (accessoryId: string) => {

  const result = await Accessory.findById(accessoryId);
  return result;
};
const updateAccessoryDB = async (
  accessoryId: string,
  file: TFileUpload,
  payload: Partial<TAccessory> & { quantity?: number; codeTitle?: string }
) => {
  const isAccessoryExists = await Accessory.findById(accessoryId);
  if (!isAccessoryExists) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "accessoryError",
      "Accessory doesn't exist."
    );
  }

  if (file) {
    await deleteFileFromCloudinary(isAccessoryExists.image!);
    payload.image = file.path;
  }
  if (isAccessoryExists.isApproved) {
    delete payload["codeTitle"];
    delete payload["quantity"];
  } else {
    const codeTitle = await generateAccessoryCodeTitle(
      payload.subCategory!,
      payload.codeTitle!
    );
    const codes = await generateAccessoriesCode({
      quantity: payload.quantity as number,
      codeTitle,
    });
    if (!payload.quantityDetails) {
      payload.quantityDetails = {
        totalQuantity: 0,
        currentQuantity: 0,
      };
    }
    if (!payload.codeDetails) {
      payload.codeDetails = {
        codeTitle: codeTitle,
        totalCodes: [],
        currentCodes: [],
      };
    }

    payload.quantityDetails.totalQuantity = payload.quantity!;
    payload.quantityDetails.currentQuantity = payload.quantity!;
    payload.codeDetails.totalCodes = codes;
    payload.codeDetails.currentCodes = codes;
  }

 

  const result = await Accessory.findByIdAndUpdate(accessoryId, payload,
  { new: true });

  return result
};
const updateStockQuantityDB = async (
  accessoryId: string,
  payload: { quantity: number }
) => {
  const isAccessoryExists = await Accessory.findById(accessoryId);
  if (!isAccessoryExists) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "accessoryError",
      "Accessory doesn't exist."
    );
  }
  const codes = await generateAccessoriesCode({
    totalQuantity: isAccessoryExists.quantityDetails.totalQuantity,
    quantity: payload.quantity as number,
    codeTitle: isAccessoryExists.codeDetails.codeTitle,
  });

  const result = await Accessory.findByIdAndUpdate(
    accessoryId,
    {
      $inc: {
        "quantityDetails.totalQuantity": payload.quantity,
        "quantityDetails.currentQuantity": payload.quantity,
      },
      $push: {
        "codeDetails.totalCodes": { $each: codes },
        "codeDetails.currentCodes": { $each: codes },
      },
    },
    { new: true }
  );

  return result;
};
const updateAccessoryStatusDB = async (
  accessoryId: string,
  isActive: boolean
) => {
  const isAccessoryExists = await Accessory.findById(accessoryId);
  if (!isAccessoryExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "accessoryError",
      "Accessory doesn't exist."
    );
  }
  const result = await Accessory.findByIdAndUpdate(
    accessoryId,
    { isActive: isActive },
    { new: true }
  );
  return result;
};
const updateAccessoryApprovedStatusDB = async (accessoryId: string) => {
  const isAccessoryExists = await Accessory.findById(accessoryId);
  if (!isAccessoryExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "accessoryError",
      "Accessory doesn't exist."
    );
  }
  const result = await Accessory.findByIdAndUpdate(
    accessoryId,
    { isApproved: true, isActive: true },
    { new: true }
  );
  return result;
};
export const AccessoryServices = {
  createAccessoryIntoDB,
  getAllAccessoriesDB,
  getSingleAccessoryDB,
  updateAccessoryDB,
  updateStockQuantityDB,
  updateAccessoryStatusDB,
  updateAccessoryApprovedStatusDB,
};
