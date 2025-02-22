import express from "express";
import { validateRequest } from "../../middlewares/validateRequest";


import { USER_ROLE } from "../user/user.constent";
import auth from "../../middlewares/auth";
import { OrderController } from "./order.controller";


const router = express.Router();

router.post(
  "/create-order",
  auth(USER_ROLE.Admin,USER_ROLE.Faculty),
  OrderController.createOrder
);
router.get(
  "/",
  OrderController.getAllOrders
);
router.get(
  "/single-order/:orderId",
  OrderController.getSingleOrder
);
router.patch(
  "/update-event/:orderId",auth(USER_ROLE.Admin,USER_ROLE.Faculty),
  OrderController.updateEventStatus
);
router.patch(
  "/update-order-items/:orderId/:itemId",auth(USER_ROLE.Admin),
  OrderController.updateOrderItems
);


export const OrderRoutes=router