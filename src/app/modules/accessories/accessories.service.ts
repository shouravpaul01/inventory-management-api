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
import { Stock } from "../stock/stock.model";

import mongoose from "mongoose";
import { JwtPayload } from "jsonwebtoken";

const createAccessoryIntoDB = async (
  file: TFileUpload,
  payload: TAccessory & { codeTitle: string; quantity: number }
) => {
  console.log(payload);
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    // Check if accessory already exists
    const isAccessoryExists = await Accessory.findOne({
      name: payload.name,
    }).session(session);
    if (isAccessoryExists) {
      throw new AppError(
        httpStatus.UNPROCESSABLE_ENTITY,
        "name",
        "Name already exists."
      );
    }

    // Handle file upload (image)
    if (file) {
      payload.image = file.path;
    }

    // Generate code title and accessory codes
    const generateCode = await generateAccessoryCodeTitle(
      payload.subCategory,
      payload.codeTitle
    );
    payload.codeTitle = generateCode;

    const isCreateStockSuccessResult = new Stock();
    await isCreateStockSuccessResult.save({ session });
    payload.stock = isCreateStockSuccessResult._id;
    // Create accessory
    const isCreateAccessorySuccessResult = await Accessory.create([payload], {
      session,
    });
    console.log(isCreateStockSuccessResult, "isCreateStockSuccessResult");

    await session.commitTransaction();

    // Return the created accessory object
    return isCreateAccessorySuccessResult[0];
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    await session.endSession();
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "accessoryError",
      "Accessory creation failed."
    );
  }
};

const getAllAccessoriesDB = async (query: Record<string, unknown>) => {
  const searchableFields = ["name"];
  const mainQuery = new QueryBuilder(
    Accessory.find({})
      .populate("category")
      .populate("subCategory")
      .populate("stock"),
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
  if (isAccessoryExists.approvalDetails.isApproved) {
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

  const result = await Accessory.findByIdAndUpdate(accessoryId, payload, {
    new: true,
  });

  return result;
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

const updateAccessoryApprovedStatusDB = async (
  user: JwtPayload,
  accessoryId: string
) => {
  // Check if accessory exists
  const isAccessoryExists = await Accessory.findById(accessoryId);
  if (!isAccessoryExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "accessoryError",
      "Accessory doesn't exist."
    );
  }

  // Update Accessory approval details
  const result = await Accessory.findByIdAndUpdate(
    accessoryId,
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

export const AccessoryServices = {
  createAccessoryIntoDB,
  getAllAccessoriesDB,
  getSingleAccessoryDB,
  updateAccessoryDB,
  updateStockQuantityDB,
  updateAccessoryStatusDB,
  updateAccessoryApprovedStatusDB,
};
