import express from "express";
import { StockController } from "./stock.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { updateStockQuantityValidation } from "./stock.validation";
import { upload } from "../../config/multer.config";
import parseData from "../../middlewares/parseData";
const router=express.Router()

router.post("/create-stock/:stockId",upload.array('images'),parseData,validateRequest(updateStockQuantityValidation),StockController.createStock)
router.get("/",StockController.getAllStocks)

export const StockRoutes=router