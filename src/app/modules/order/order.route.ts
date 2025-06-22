import express from "express";
import { validateRequest } from "../../middlewares/validateRequest";


import { USER_ROLE } from "../user/user.constent";
import auth from "../../middlewares/auth";
import { OrderController } from "./order.controller";
import { returnedAccessoriesSchemaValidation, updateExpectedQuantitySchemaValidation } from "./order.validation";


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
router.get(
  "/user-orders/:userId", OrderController.getAllOrdersByUsers)
  router.patch(
  "/update-order-accessory/:orderId",auth(USER_ROLE.Admin,USER_ROLE.Faculty),validateRequest(updateExpectedQuantitySchemaValidation),
  OrderController.updateExpectedQuantity)
router.patch(
  "/returned-accessories/:orderId", validateRequest(returnedAccessoriesSchemaValidation), OrderController.returnedAccessoriesCodes)

export const OrderRoutes=router