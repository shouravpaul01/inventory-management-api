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
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    // Check if accessory already exists
    const isAccessoryExists = await Accessory.findOne({
      name: payload.name,
    }).session(session);
    if (isAccessoryExists) {
      throw new AppError(httpStatus.CONFLICT, "name", "Name already exists.");
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
    const isCodeTitleExists = await Accessory.findOne({
      codeTitle: generateCode,
    }).session(session);

    if (isCodeTitleExists) {
      throw new AppError(
        httpStatus.CONFLICT,
        "codeTitle",
        "Code title already exists."
      );
    }
    payload.codeTitle = generateCode;

    const isCreateStockSuccessResult = new Stock();
    await isCreateStockSuccessResult.save({ session });
    payload.stock = isCreateStockSuccessResult._id;
    // Create accessory
    const isCreateAccessorySuccessResult = await Accessory.create([payload], {
      session,
    });

    await session.commitTransaction();

    // Return the created accessory object
    return isCreateAccessorySuccessResult[0];
  } catch (error: any) {
    console.log(error, "erore");

    await session.abortTransaction();
    if (error instanceof AppError && error.isAppError) {
      throw error;
    } else {
      throw new AppError(
        httpStatus.UNPROCESSABLE_ENTITY,
        "accessoryError",
        "Accessory creation failed."
      );
    }
  } finally {
    await session.endSession();
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
  payload: Partial<TAccessory>
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
    isAccessoryExists?.image && await deleteFileFromCloudinary(isAccessoryExists?.image!);
    payload.image = file.path;
  }
    // Generate a new code title if subCategory or codeTitle is provided
    if (payload.subCategory || payload.codeTitle) {
      
      const generateCode = await generateAccessoryCodeTitle(
        payload.subCategory! ,
        payload.codeTitle! 
      );
  
      if (generateCode !== isAccessoryExists.codeTitle){
    
        // Check if the generated code title already exists in another accessory
        const isCodeTitleExists = await Accessory.findOne({
          codeTitle: generateCode,
          _id: { $ne: accessoryId }, // Exclude the current accessory
        });

        if (isCodeTitleExists) {
          throw new AppError(
            httpStatus.CONFLICT,
            "codeTitle",
            "Code title already exist."
          );
        }
      }
  
  
      payload.codeTitle = generateCode; 
    }
  
  
    console.log("3")

  const result = await Accessory.findByIdAndUpdate(accessoryId, payload, {
    new: true,
  });

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
  updateAccessoryStatusDB,
  updateAccessoryApprovedStatusDB,
};
