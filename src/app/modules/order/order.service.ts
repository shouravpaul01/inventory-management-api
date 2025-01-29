import { JwtPayload } from "jsonwebtoken";
import { TOrderItem } from "./order.interface";
import { Order } from "./order.model";
import { Accessory } from "../accessories/accessories.modal";
import { orderValidation } from "./order.validation";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";

import mongoose from 'mongoose';

const createOrderDB = async (
  user: JwtPayload,
  payload: TOrderItem[] 
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate payload first
    const isValidateOrder = orderValidation.safeParse(payload);
    if (!isValidateOrder.success) {
      throw new AppError(
        httpStatus.BAD_REQUEST, 
        'orderError',
        "Order failed to proceed. Please try again."
      );
    }

    // Create order document
    const newOrder = {
      orderBy: user._id,
      accessories: payload,
    };

 
    for (const item of payload) {
      await Accessory.findByIdAndUpdate(
        item.accessory,
        {
          $inc: {
            'quantityDetails.currentQuantity': -item.quantity,
            'quantityDetails.orderQuantity': item.quantity,
          },
        },
        { session, new: true } 
      );
    }

   
    const isOrderSuccess = await Order.create([newOrder], { session })
    session.commitTransaction()

    return isOrderSuccess[0];
    
  } catch (error) {
    await session.abortTransaction();
    throw error; 
  } finally {
    session.endSession();
  }
};

export const OrderServices = {
  createOrderDB,
};
