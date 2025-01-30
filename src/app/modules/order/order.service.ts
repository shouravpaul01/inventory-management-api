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
    delete query["startDate"]
    delete query["endDate"]
  }


  console.log(filterQuery, "4");

  const mainQuery = new QueryBuilder(
    Order.find(filterQuery),
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
export const OrderServices = {
  createOrderDB,
  getAllOrdersDB
};
