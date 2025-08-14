import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { TAccessory } from "./accessories.interface";
import {
  generateAccessoryCodeTitle,
} from "./accessories.utils";
import { QueryBuilder } from "../../builder/QueryBuilder";
import { deleteFileFromCloudinary } from "../../utils/deleteFileFromCloudinary";
import { Stock } from "../stock/stock.model";
import mongoose, { Types } from "mongoose";

import { Accessory } from "./accessories.modal";
import { JwtPayload } from "jsonwebtoken";
import { Faculty } from "../faculty/faculty.model";


const logEvent = (
  eventType: "created" | "updated" | "approved" | "activated" | "deactivated" | "New Stock",
  performedBy: Types.ObjectId,
  comments?: string
) => ({
  eventType,
  performedBy,
  comments,
  performedAt: new Date(),
});

const createAccessoryIntoDB = async (
  file: any,
  payload: TAccessory & { codeTitle: string; quantity: number },
  user: JwtPayload
) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const isAccessoryExists = await Accessory.findOne({
      name: payload.name,
    }).session(session);

    if (isAccessoryExists) {
      throw new AppError(httpStatus.CONFLICT, "name", "Name already exists.");
    }

    if (file) {
      payload.image = file.path;
    }

    if (payload.isItReturnable === "true") {
      const generateCode = await generateAccessoryCodeTitle(
        payload.subCategory,
        payload.codeTitle
      );
console.log(generateCode,"generateCode")
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
    }

    const newStock = new Stock();
    await newStock.save({ session });
    payload.stock = newStock._id;

   console.log(payload,"payload")
    payload.eventsHistory = [
      logEvent("created", user.faculty,"Accessory created")
    ];

    const [result] = await Accessory.create([payload], { session });

    await session.commitTransaction();
    return result;
  } catch (error: any) {
    await session.abortTransaction();

    if (error instanceof AppError && error.isAppError) {
      throw error;
    }
    if (file) {
      await deleteFileFromCloudinary(file.path)
    }
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "accessoryError",
      "Accessory creation failed.Pls try again."
    );
  } finally {
    await session.endSession();
  }
};

const getAllAccessoriesDB = async (query: any) => {
  const searchableFields = ["name"];
  const filterQuery: any = {};

  const mainQuery = new QueryBuilder(
    Accessory.find(filterQuery)
      .populate("category")
      .populate("subCategory")
      .populate("stock"),
    query
  )
    .search(searchableFields)
    .filter();

  const totalPages = (await mainQuery.totalPages()).totalQuery;
  const paginateQuery = mainQuery.paginate();
  const accessories = await paginateQuery.modelQuery;

  return { data: accessories, totalPages };
};

const getSingleAccessoryDB = async (accessoryId: string) => {
  const result = await Accessory.findById(accessoryId)
    .populate("category")
    .populate("subCategory")
    .populate("stock");

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "accessoryError",
      "Accessory not found."
    );
  }

  return result;
};

const updateAccessoryDB = async (
  accessoryId: string,
  file: any,
  payload: Partial<TAccessory>,
  user: JwtPayload
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
    if (isAccessoryExists.image) {
      await deleteFileFromCloudinary(isAccessoryExists.image);
    }
    payload.image = file.path;
  }

  if (payload.subCategory || payload.codeTitle) {
    const generateCode = await generateAccessoryCodeTitle(
      payload.subCategory || isAccessoryExists.subCategory,
      payload.codeTitle || isAccessoryExists.codeTitle
    );

    if (generateCode !== isAccessoryExists.codeTitle) {
      const isCodeTitleExists = await Accessory.findOne({
        codeTitle: generateCode,
        _id: { $ne: accessoryId },
      });

      if (isCodeTitleExists) {
        throw new AppError(
          httpStatus.CONFLICT,
          "codeTitle",
          "Code title already exists."
        );
      }

      payload.codeTitle = generateCode;
    }
  }

  const result = await Accessory.findByIdAndUpdate(
    accessoryId,
    {
      ...payload,
      $push: {
        eventsHistory: logEvent("updated", user.faculty, "Accessory updated"),
      },
    },
    { new: true }
  );

  return result;
};

const updateAccessoryStatusDB = async (
  accessoryId: string,
  isActive: string,
  user: JwtPayload
) => {
 try {
  const accessory = await Accessory.findById(accessoryId);
  if (!accessory) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "accessoryError",
      "Accessory doesn't exist."
    );
  }

  const statusType = isActive=="true" ? "activated" : "deactivated";

  const result = await Accessory.findByIdAndUpdate(
    accessoryId,
    {
      isActive,
      $push: {
        eventsHistory: logEvent(statusType, user.faculty, `Accessory ${statusType}`),
      },
    },
    { new: true }
  );

  return result;
 } catch (error) {
  throw new AppError(
    httpStatus.INTERNAL_SERVER_ERROR,
    "accessoryError",
    "Failed to update Accessory status."
  );
 }
};

const updateAccessoryApprovedStatusDB = async (
  user: JwtPayload,
  accessoryId: string
) => {
 try {
  const accessory = await Accessory.findById(accessoryId);
  if (!accessory) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "accessoryError",
      "Accessory doesn't exist."
    );
  }

  const result = await Accessory.findByIdAndUpdate(
    accessoryId,
    {
      isApproved: true,
      isActive: true,
      $push: {
        eventsHistory: logEvent("approved", user.faculty, "Accessory approved"),
      },
    },
    { new: true }
  );

  return result;
 } catch (error) {
  throw new AppError(
    httpStatus.INTERNAL_SERVER_ERROR,
    "accessoryError",
    "Failed to update Approved status."
  );
 }
};
const deleteSingleImageDB = async (accessoryId: string, imageUrl: string) => {
  const room = await Faculty.findById(accessoryId);
  if (!room || !imageUrl) {
    throw new AppError(httpStatus.NOT_FOUND, "roomError", "Accessory does not exist.");
  }

  const deleted = await deleteFileFromCloudinary(imageUrl);
  if (!deleted) {
    throw new AppError(httpStatus.NOT_FOUND, "imageError", "Failed to delete image.");
  }

  const updatedRoom = await Faculty.findByIdAndUpdate(
    accessoryId,
    { $pull: { images: imageUrl } },
    { new: true }
  );

  return updatedRoom;
};
export const AccessoryServices = {
  createAccessoryIntoDB,
  getAllAccessoriesDB,
  getSingleAccessoryDB,
  updateAccessoryDB,
  updateAccessoryStatusDB,
  updateAccessoryApprovedStatusDB,
  deleteSingleImageDB
};
