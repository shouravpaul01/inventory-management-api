import httpStatus from "http-status";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import { TStock, TStockDetail } from "./stock.interface";
import { Stock } from "./stock.model";
import { Accessory } from "../accessories/accessories.modal";
import { generateAccessoriesCode } from "../accessories/accessories.utils";
import { JwtPayload } from "jsonwebtoken";
import { deleteFileFromCloudinary } from "../../utils/deleteFileFromCloudinary";
import { Types } from "mongoose";

const createStockDB = async (
  stockId: string,
  files: any,
  payload: Partial<TStock> & {
    quantity: number;
    images: string[];
    description: string;
    accessoryCodes: string[];
  }
) => {
  const isExistsStock = await Stock.findById(stockId);

  const isExistsAccessory = await Accessory.findOne({ stock: stockId });
  if (!isExistsStock) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "stockError",
      "Failed to update stock."
    );
  }
  if (Array.isArray(files) && files.length > 0) {
    payload.images = files.map((file) => file.path);
  }

  const result = await Stock.findByIdAndUpdate(
    stockId,
    { $push: { details: payload } },
    { new: true }
  );
  return result;
};

const getAllStocksDB = async (query: Record<string, unknown>) => {
  console.log(query, "query");
  const detailConditions: any[] = [];
  const page = parseInt(query.page as string) || 1; // Default start index
  const limit = parseInt(query.limit as string) || 5;
  // Add approvalStatus condition if provided
  if (query?.approvalStatus !== undefined) {
    detailConditions.push({
      $eq: [
        "$$detail.approvalDetails.isApproved",
        JSON.parse(query?.approvalStatus as string),
      ],
    });
  }

  // Add dateRange conditions if provided
  if (query?.startDate && query?.endDate) {
    detailConditions.push(
      { $gte: ["$$detail.createdAt", new Date(query?.startDate as string)] },
      { $lte: ["$$detail.createdAt", new Date(query?.endDate as string)] }
    );
  }

  const pipeline = [
    { $match: { _id: new Types.ObjectId(query._id as string) } },
    {
      $project: {
        _id: 1,

        details: {
          $slice: [
            {
              $filter: {
                input: "$details",
                as: "detail",
                cond:
                  detailConditions.length > 0
                    ? { $and: detailConditions }
                    : { $literal: true },
              },
            },
            0,
            limit * page,
          ],
        },
      },
    },
  ];

  const stocks = await Stock.aggregate(pipeline);
  return stocks[0];
};

const updateStockApprovedStatusDB = async (
  user: JwtPayload,
  stockId: string,
  stockDetailsId: string
) => {
  console.log(stockId,stockDetailsId,"paici")
  // Check if Stock exists
  const isStockExists = await Stock.findOne(
    { _id: stockId, "details._id": stockDetailsId },
    {
      "details.$": 1,
      quantityDetails: 1,
      codeDetails: 1,
    }
  );
  if (!isStockExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "stockError",
      "Stock doesn't exist."
    );
  }
  const isExistsAccessory = await Accessory.findOne({ stock: stockId });
  if (!isExistsAccessory) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "stockError",
      "Stock doesn't exist."
    );
  }
  let codes: any = [];
  if (isExistsAccessory.isItReturnable) {
    const generateCodes = await generateAccessoriesCode({
      totalQuantity: isExistsAccessory.quantityDetails.totalQuantity,
      quantity: isStockExists.details[0].quantity,
      codeTitle: isExistsAccessory?.codeTitle as string,
    });
    codes = generateCodes;
  }

  const updateAccessoryData = {
    quantityDetails: {
      totalQuantity:
        isExistsAccessory.quantityDetails.totalQuantity +
        isStockExists.details[0].quantity,
      currentQuantity:
        isExistsAccessory.quantityDetails.currentQuantity +
        isStockExists.details[0].quantity,
    },

    $push: {
      "codeDetails.totalCodes": codes,
      "codeDetails.currentCodes": codes,
    },
  };

  await Accessory.findOneAndUpdate({ stock: stockId }, updateAccessoryData, {
    new: true,
  });
  // Update Stock approval details
  const result = await Stock.findOneAndUpdate(
    { _id: stockId, "details._id": stockDetailsId },
    {
      $set: {
        "details.$.accessoryCodes": codes,
        "details.$.approvalDetails.isApproved": true,
        "details.$.approvalDetails.approvedBy": user._id,
        "details.$.approvalDetails.approvedDate": new Date(),
      },
    },
    { new: true }
  );
  return result;
};
const getSingleStockDB = async (stockId: string, stockDetailsId: string) => {
  const isStockExists = await Stock.findOne(
    { _id: stockId, "details._id": stockDetailsId },
    {
      "details.$": 1,
    }
  );
  if (!isStockExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "stockError",
      "Stock doesn't exist."
    );
  }
  return isStockExists.details[0];
};
const updateStockDB = async (
  stockId: string,
  stockDetailsId: string,
  files: any,
  payload: Partial<TStockDetail>
) => {
  const isStockExists = await Stock.findOne(
    { _id: stockId, "details._id": stockDetailsId },
    {
      "details.$": 1,
    }
  );
  if (!isStockExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "stockError",
      "Stock doesn't exist."
    );
  }
  if (Array.isArray(files) && files.length > 0) {
    if (isStockExists?.details[0]?.images.length > 0) {
      isStockExists?.details[0]?.images?.forEach(
        async (image) => await deleteFileFromCloudinary(image)
      );
    }
    payload.images = files.map((file) => file.path);
  }
  const result = await Stock.findOneAndUpdate(
    { _id: stockId, "details._id": stockDetailsId },
    {
      $set: {
        "details.$.quantity": payload.quantity,
        "details.$.images": payload.images,
        "details.$.description": payload.description,
      },
    },
    { new: true }
  );
  return result;
};
export const StockService = {
  createStockDB,
  getAllStocksDB,
  updateStockApprovedStatusDB,
  getSingleStockDB,
  updateStockDB,
};
