import express from "express";
import { StockController } from "./stock.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { updateStockQuantityValidation } from "./stock.validation";
import { upload } from "../../config/multer.config";
import parseData from "../../middlewares/parseData";
import auth from "../../middlewares/auth";
import { USER_ROLE } from "../user/user.constent";
const router=express.Router()

router.post("/create-stock/:stockId",upload.array('images'),parseData,validateRequest(updateStockQuantityValidation),StockController.createStock)
router.get("/",StockController.getAllStocks)
router.patch('/update-approved-status',auth(USER_ROLE.Admin),StockController.updateStockApprovedStatus)

export const StockRoutes=router