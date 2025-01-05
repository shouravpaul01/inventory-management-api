import httpStatus from "http-status";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import { TStock } from "./stock.interface";
import { Stock } from "./stock.model";
import { Accessory } from "../accessories/accessories.modal";
import { generateAccessoriesCode } from "../accessories/accessories.utils";

const createStockDB = async (
  stockId: string,
  files: any,
  payload: { quantity: number; images: string[]; description: string }
) => {
  const isExistsStock = await Stock.findById(stockId);
  const isExistsAccessory = await Accessory.findById(stockId);
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
  const codes = await generateAccessoriesCode({
    totalQuantity: isExistsStock.quantityDetails.totalQuantity,
    quantity: payload.quantity,
    codeTitle: isExistsAccessory?.codeTitle as string,
  });
  const stockData = {
    quantityDetails: {
      totalQuantity:
        isExistsStock.quantityDetails.totalQuantity + payload.quantity,
      currentQuantity:
        isExistsStock.quantityDetails.currentQuantity + payload.quantity,
    },
    $push: {
      codeDetails: {
        totalCodes: codes,
        currentCodes: codes,
      },
      details: payload,
    },
  };
  const result = await Stock.findByIdAndUpdate(
    stockId,
    stockData,
    { new: true }
  );
  return result;
};
const getAllStocksDB = async (query: Record<string, unknown>) => {
  console.log(query, "query");
  const stocks = await Stock.findById(query._id);

  console.log(stocks);
  return stocks;
};

export const StockService = {
  createStockDB,
  getAllStocksDB,
};
