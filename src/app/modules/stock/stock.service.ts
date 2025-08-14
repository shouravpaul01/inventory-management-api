import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { TStockDetail } from "./stock.interface";
import { Stock } from "./stock.model";
import { Accessory } from "../accessories/accessories.modal";
import { generateAccessoriesCode } from "../accessories/accessories.utils";
import { JwtPayload } from "jsonwebtoken";
import { deleteFileFromCloudinary } from "../../utils/deleteFileFromCloudinary";
import { Types } from "mongoose";

const logEvent = (
  type: "created" | "updated" | "approved" | "activated" | "deactivated" | "stock",
  performedBy: Types.ObjectId,
  comments?: string
) => ({
  eventType: type,
  performedBy,
  performedAt: new Date(),
  comments,
});

const createStockDB = async (
  stockId: string,
  user: JwtPayload,
  files: Record<string, { path: string }[]> | any,
  payload: Partial<TStockDetail> & { quantity: number }
) => {
  // console.log(files,"files")
  // console.log(payload,"payload1")
  const session = await Stock.startSession();
  try {
    session.startTransaction();

    const isExistsStock = await Stock.findById(stockId).session(session);
    const isExistsAccessory = await Accessory.findOne({ stock: stockId }).session(session);

    if (!isExistsStock && !isExistsAccessory) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "stockError",
        "Failed to update stock."
      );
    }

    // Map uploaded files into model fields
    if (files ) {
      if (Array.isArray(files.documentImages) && files.documentImages.length > 0) {
        payload.documentImages = files.documentImages.map((file: any) => file.path);
      }
      if (Array.isArray(files.locatedImages) && files.locatedImages.length > 0) {
        payload.locatedDetails = payload.locatedDetails || ({} as any);
        (payload.locatedDetails as any).locatedImages = files.locatedImages.map(
          (file: any) => file.path
        );
      }
    }

    payload.eventsHistory = [
      logEvent(
        "created",
       (user as any)?.faculty,
        "Stock detail created"
      ),
    ];
console.log(payload,"payload")
    const result = await Stock.findByIdAndUpdate(
      stockId,
      { $push: { details: payload } },
      { new: true, session }
    );

    await Accessory.findOneAndUpdate(
      { stock: stockId },
      {
        $push: {
          eventsHistory: logEvent(
            "stock",
            (user as any)?.faculty,
            "Stock detail created"
          ),
        },
      },
      { new: true, session }
    );

    await session.commitTransaction();
    return result;
  } catch (error) {
    console.log(error,"error")
    await session.abortTransaction();
    if (files) {
      if (Array.isArray(files.documentImages) && files.documentImages.length > 0) {
       files.documentImages.forEach(async(image:any) => {
        await deleteFileFromCloudinary(image.path)
       });
      }
      if (Array.isArray(files.locatedImages) && files.locatedImages.length > 0) {
        
        files.locatedImages?.forEach(async(image:any) => {
          await deleteFileFromCloudinary(image.path)
         });
      }
    }
    throw new AppError(httpStatus.BAD_REQUEST,"stockError","Stock Creation failed.Pls try again.");
  } finally {
    session.endSession();
  }
};

const getAllStocksDB = async (query: Record<string, unknown>) => {
  console.log(query, "query");
  const detailConditions: any[] = [];
  const page = parseInt(query.page as string) || 1; 
  const limit = parseInt(query.limit as string) || 5;
  // Add approvalStatus condition if provided
  if (query?.approvalStatus !== undefined) {
    detailConditions.push({
      $eq: ["$$detail.isApproved", JSON.parse(query?.approvalStatus as string)],
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
  const session = await Stock.startSession();
  try {
    session.startTransaction();

    const isStockExists = await Stock.findOne(
      { _id: stockId, "details._id": stockDetailsId },
      { "details.$": 1 }
    ).session(session);
    if (!isStockExists) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "stockError",
        "Stock doesn't exist."
      );
    }

    const isExistsAccessory = await Accessory.findOne({ stock: stockId }).session(session);
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

    const updateAccessoryData: any = {
      quantityDetails: {
        totalQuantity:
          isExistsAccessory.quantityDetails.totalQuantity + isStockExists.details[0].quantity,
        currentQuantity:
          isExistsAccessory.quantityDetails.currentQuantity + isStockExists.details[0].quantity,
      },
      $push: {
        "codeDetails.totalCodes": codes,
        "codeDetails.currentCodes": codes,
      },
    };

    await Accessory.findOneAndUpdate({ stock: stockId }, updateAccessoryData, {
      new: true,
      session,
    });

    const result = await Stock.findOneAndUpdate(
      { _id: stockId, "details._id": stockDetailsId },
      {
        $set: {
          "details.$.accessoryCodes": codes,
          "details.$.isApproved": true,
          "details.$.isActive": true,
        },
        $push: {
          "details.$.eventsHistory": logEvent(
            "approved",
            new Types.ObjectId(String(user._id)),
            "Stock approved"
          ),
        },
      },
      { new: true, session }
    );

    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
const getSingleStockDB = async (stockId: string, stockDetailsId: string) => {
  const isStockExists = await Stock.findOne(
    { _id: stockId, "details._id": stockDetailsId },
    {
      "details.$": 1,
    }
  ).populate("details.locatedDetails.roomNo");
  if (!isStockExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "stockError",
      "Stock doesn't exist."
    );
  }
  return isStockExists.details[0];
};
const deleteSingleImageDB = async (
  stockId: string,
  stockDetailsId: string,
  imageUrl: string,
  fieldName: "documentImages" | "locatedImages"
) => {
  if (!stockId || !stockDetailsId || !imageUrl || !fieldName) {
    throw new AppError(httpStatus.BAD_REQUEST, "stockError", "Invalid request parameters.");
  }

  const isStockExists = await Stock.findOne(
    { _id: stockId, "details._id": stockDetailsId },
    { "details.$": 1 }
  );

  if (!isStockExists) {
    throw new AppError(httpStatus.NOT_FOUND, "stockError", "Stock doesn't exist.");
  }

  const deleted = await deleteFileFromCloudinary(imageUrl);
  if (!deleted) {
    throw new AppError(httpStatus.NOT_FOUND, "imageError", "Failed to delete image.");
  }

  const pullPath =
    fieldName === "documentImages"
      ? { "details.$.documentImages": imageUrl }
      : { "details.$.locatedDetails.locatedImages": imageUrl };

  const updatedStock = await Stock.findOneAndUpdate(
    { _id: stockId, "details._id": stockDetailsId },
    { $pull: pullPath },
    { new: true }
  );

  return updatedStock;
};
const updateStockDB = async (
  stockId: string,
  stockDetailsId: string,
  user: JwtPayload,
  files: Record<string, { path: string }[]> | any,
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
 
  if (files && typeof files === "object") {
    if (Array.isArray(files.documentImages) && files.documentImages.length > 0) {
      const prevDocs = (isStockExists.details[0] as any)?.documentImages || [];
      for (const imagePath of prevDocs) {
        await deleteFileFromCloudinary(imagePath);
      }
      payload.documentImages = files.documentImages.map((file: any) => file.path);
    }
    if (Array.isArray(files.locatedImages) && files.locatedImages.length > 0) {
      const prevLocated =
        (isStockExists.details[0] as any)?.locatedDetails?.locatedImages || [];
      for (const imagePath of prevLocated) {
        await deleteFileFromCloudinary(imagePath);
      }
      payload.locatedDetails = payload.locatedDetails || ({} as any);
      (payload.locatedDetails as any).locatedImages = files.locatedImages.map(
        (file: any) => file.path
      );
    }
  }
  const result = await Stock.findOneAndUpdate(
    { _id: stockId, "details._id": stockDetailsId },
    {
      $set: {
        "details.$.quantity": payload.quantity,
        "details.$.documentImages": payload.documentImages,
        "details.$.locatedDetails": payload.locatedDetails,
        "details.$.description": payload.description,
      },
      $push: {
        "details.$.eventsHistory": logEvent(
          "updated",
          new Types.ObjectId(String(user._id)),
          "Stock detail updated"
        ),
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
  deleteSingleImageDB,
  updateStockDB,
};
