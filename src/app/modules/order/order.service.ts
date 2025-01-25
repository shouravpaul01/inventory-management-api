import { JwtPayload } from "jsonwebtoken";
import { TOrderItem } from "./order.interface";
import { Order } from "./order.model";
import { Accessory } from "../accessories/accessories.modal";
import { Stock } from "../stock/stock.model";

const createOrderDB = async (
  user: JwtPayload,
  payload: Partial<TOrderItem[]>
) => {
  console.log(payload, user);
  const newOrder = {
    orderBy: user?._id,
    accessoris: payload,
  };
  if (payload) {
    payload.forEach(async (item) => {
      const isAccessoryExists = await Accessory.findById(item?.accessory);
      await Stock.findByIdAndUpdate(isAccessoryExists?.stock, {
        $inc: {
          "quantityDetails.currentQuantity": -item?.quantity!,
          "quantityDetails.orderQuantity": item?.quantity!,
        },
      });
    });
  }
  const isOrderSuccess = await Order.create(newOrder);
  return isOrderSuccess;
};

export const OrderServices = {
  createOrderDB,
};
