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


export const OrderRoutes=router