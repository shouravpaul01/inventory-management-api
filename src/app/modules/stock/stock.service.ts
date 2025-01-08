import httpStatus from "http-status";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import { TStock } from "./stock.interface";
import { Stock } from "./stock.model";
import { Accessory } from "../accessories/accessories.modal";
import { generateAccessoriesCode } from "../accessories/accessories.utils";
import { JwtPayload } from "jsonwebtoken";

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
  // const codes = await generateAccessoriesCode({
  //   totalQuantity: isExistsStock.quantityDetails.totalQuantity,
  //   quantity: payload.quantity,
  //   codeTitle: isExistsAccessory?.codeTitle as string,
  // });
  // payload.accessoryCodes=codes

  const result = await Stock.findByIdAndUpdate(
    stockId,
    { $push: { details: payload } },
    { new: true }
  );
  return result;
};
const getAllStocksDB = async (query: Record<string, unknown>) => {
  // console.log(query, "query");
  const stocks = await Stock.findById(query._id);

  // console.log(stocks);
  return stocks;
};
const updateStockApprovedStatusDB = async (
  user: JwtPayload,
  stockId: string,
  stockDetailsId: string
) => {
  console.log(stockId, stockDetailsId);
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
      "accessoryError",
      "Stock doesn't exist."
    );
  }
  const isExistsAccessory = await Accessory.findOne({ stock: stockId });

  const codes = await generateAccessoriesCode({
    totalQuantity: isStockExists.quantityDetails.totalQuantity,
    quantity: isStockExists.details[0].quantity,
    codeTitle: isExistsAccessory?.codeTitle as string,
  });

  const stockData = {
    quantityDetails: {
      totalQuantity:
        isStockExists.quantityDetails.totalQuantity +
        isStockExists.details[0].quantity,
      currentQuantity:
        isStockExists.quantityDetails.currentQuantity +
        isStockExists.details[0].quantity,
    },

    $push: {
      "codeDetails.totalCodes": codes,
      "codeDetails.currentCodes": codes,
    },

    $set: {
      "details.$.accessoryCodes": codes,
      "details.$.approvalDetails.isApproved": true,
      "details.$.approvalDetails.approvedBy": user._id,
      "details.$.approvalDetails.approvedDate": new Date(),
    },
  };
  console.log(isStockExists);
  // Update Stock approval details
  const result = await Stock.findOneAndUpdate(
    { _id: stockId, "details._id": stockDetailsId },
    stockData,
    { new: true }
  );
  return result;
};
export const StockService = {
  createStockDB,
  getAllStocksDB,
  updateStockApprovedStatusDB,
};
