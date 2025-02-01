import { JwtPayload } from "jsonwebtoken";
import { Order } from "./order.model";
import { Accessory } from "../accessories/accessories.modal";
import { TOrderItem } from "./order.interface";
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
    session.commitTransaction();

    return isOrderSuccess[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
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
  const serialWayProcces:any = {
    pending: ["approved"],
    approved: ["delivered"],
    delivered: ["received"],
    received: [], 
  };
  const lastEvent = isExistsOrder.events.length > 0 
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
export const OrderServices = {
  createOrderDB,
  getAllOrdersDB,
  updateEventStatusDB
};
