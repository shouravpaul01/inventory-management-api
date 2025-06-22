import { JwtPayload } from "jsonwebtoken";
import { Order } from "./order.model";
import { Accessory } from "../accessories/accessories.modal";
import { TOrderItem, TReturnDetails } from "./order.interface";
import { orderValidation } from "./order.validation";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";

import mongoose from "mongoose";
import { QueryBuilder } from "../../builder/QueryBuilder";

const createOrderDB = async (user: JwtPayload, payload: TOrderItem[]) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate payload first
    const isValidateOrder = orderValidation.safeParse(payload);
    if (!isValidateOrder.success) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "orderError",
        "Order failed to proceed. Please try again."
      );
    }

    // Create order document
    const newOrder = {
      orderBy: user._id,
      items: payload,
    };

    for (const item of payload) {
      await Accessory.findByIdAndUpdate(
        item.accessory,
        {
          $inc: {
            "quantityDetails.currentQuantity": -item.expectedQuantity,
            "quantityDetails.orderQuantity": item.expectedQuantity,
          },
        },
        { session, new: true }
      );
    }

    const isOrderSuccess = await Order.create([newOrder], { session });
    await session.commitTransaction();

    return isOrderSuccess[0];
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
const getAllOrdersDB = async (query: any) => {
  const searchableFields = ["invoiceId"];
  const filterQuery: any = {};
  console.log(query, "main");
  if (query?.startDate && query?.endDate) {
    filterQuery.push(
      { $gte: ["orderDate", new Date(query?.startDate as string)] },
      { $lte: ["orderDate", new Date(query?.endDate as string)] }
    );
    delete query["startDate"];
    delete query["endDate"];
  }

  console.log(filterQuery, "4");

  const mainQuery = new QueryBuilder(
    Order.find(filterQuery).populate({
      path: "orderBy",
      populate: {
        path: "faculty",
      },
    }),
    query
  )
    .search(searchableFields)
    .filter();

  const totalPages = (await mainQuery.totalPages()).totalQuery;
  const paginateQuery = mainQuery.paginate();
  const orders = await paginateQuery.modelQuery;

  const result = { data: orders, totalPages: totalPages };
  return result;
};
const getSingleOrderDB = async (orderId: string) => {
  console.log(orderId, "orderId");
  const result = await Order.findById(orderId).populate({
    path: "items.accessory",
    populate: [{ path: "category" }, { path: "subCategory" }],
  });
  return result;
};
const updateEventStatusDB = async (
  user: JwtPayload,
  orderId: string,
  event: string
) => {
  const isExistsOrder = await Order.findById(orderId);
  if (!isExistsOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "orderError",
      "Order not found!."
    );
  }
  const serialWayProcces: any = {
    pending: ["approved"],
    approved: ["delivered"],
    delivered: ["received"],
    received: [],
  };
  const lastEvent =
    isExistsOrder.events.length > 0
      ? isExistsOrder.events[isExistsOrder.events.length - 1].event
      : "pending";

  if (!serialWayProcces[lastEvent]?.includes(event)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "orderError",
      "Invaild Process."
    );
  }
  const result = await Order.findByIdAndUpdate(
    orderId,
    {
      $push: {
        events: {
          event: event,
          user: user._id,
        },
      },
    },
    { new: true }
  );

  return result;
};

const updateOrderItemsDB = async (
  orderId: string,
  itemId: string,
  payload: any
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updateItem: any = {};
    for (const key in payload) {
      if (payload[key] !== undefined) {
        updateItem[`items.$.${key}`] = payload[key];
      }
    }

    const isOrderItemExists = await Order.findOne(
      { _id: orderId, "items.accessory": itemId },
      {
        "items.$": 1,
      },
      { session }
    );

    console.log(isOrderItemExists);
    if (!isOrderItemExists) {
      throw new Error("Order or item not found");
    }
    const itemExists = isOrderItemExists.items[0];
    console.log(itemExists);
    const qty =
      itemExists.expectedQuantity - (payload as TOrderItem).providedQuantity;
    const updateAccessoryData: any = {
      $inc: {
        "quantityDetails.currentQuantity": qty,
        "quantityDetails.orderQuantity": -qty,
      },
    };
    if ((payload as TOrderItem)?.providedAccessoryCodes?.length > 0) {
      (updateAccessoryData["$push"] = {
        "codeDetails.orderCodes": (payload as TOrderItem)
          ?.providedAccessoryCodes,
      }),
        (updateAccessoryData["$pull"] = {
          "codeDetails.currentCodes": {
            $in: (payload as TOrderItem)?.providedAccessoryCodes,
          },
        });
    }

    await Accessory.findByIdAndUpdate(itemId, updateAccessoryData, { session });

    const result = await Order.findOneAndUpdate(
      { _id: orderId, "items.accessory": itemId },
      { $set: updateItem },
      { new: true, session }
    );

    if (!result) {
      throw new Error("Order or item not found");
    }

    await session.commitTransaction();
    session.endSession();

    return null;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
const getAllOrdersByUsersDB = async (
  userId: string,
  query: Record<string, undefined>
) => {
  const searchableFields = ["invoiceId"];
  const filterQuery: any = {};

  if (userId) {
    filterQuery.orderBy = userId;
  } else {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "orderError",
      "User ID is required."
    );
  }
  console.log(filterQuery, "filterQuery");
  const mainQuery = new QueryBuilder(
    Order.find(filterQuery).populate({
      path: "orderBy",
      populate: {
        path: "faculty",
      },
    }),
    query
  )
    .search(searchableFields)
    .filter();

  const totalPages = (await mainQuery.totalPages()).totalQuery;
  const paginateQuery = mainQuery.paginate();
  const orders = await paginateQuery.modelQuery;

  const result = { data: orders, totalPages: totalPages };
  return result;
};
const updateExpectedQuantityDB = async (orderId: string,
  payload: Partial<TOrderItem>) => {
    if (!orderId && !payload.accessory) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "orderError",
        "Accessory ID is required."
      );
    }
  const result = await Order.findOneAndUpdate(
    { _id: orderId, "items.accessory": payload.accessory! },
    { $set: { "items.$.expectedQuantity": payload.expectedQuantity } },
    { new: true }
  );

  return result;
};
const returnedAccessoriesCodeDB = async (
  orderId: string,
  payload: Partial<TReturnDetails>
) => {
  
  if (!payload.accessory) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "orderError",
      "Accessory ID is required."
    );
  }
  payload.quantity = payload.returnedAccessoriesCodes?.length || 0;
  const result = await Order.findOneAndUpdate(
    {
      _id: orderId,
      "items.accessory": payload.accessory!, // assuming itemId is the accessory ID
    },
    {
      $push: {
        "items.$[item].returnedDetails": payload,
        "items.$[item].returnedAllAccessoriesCodes":
          payload.returnedAccessoriesCodes!,
      },

      $inc: {
        "items.$[item].returnedQuantity":
          payload.returnedAccessoriesCodes!.length,
      },
    },
    {
      arrayFilters: [{ "item.accessory": payload.accessory! }],
      new: true,
    }
  );

  return result;
};
export const OrderServices = {
  createOrderDB,
  getAllOrdersDB,
  getSingleOrderDB,
  updateEventStatusDB,
  updateOrderItemsDB,
  getAllOrdersByUsersDB,
  updateExpectedQuantityDB,
  returnedAccessoriesCodeDB,
};
