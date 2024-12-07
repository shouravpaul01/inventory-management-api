import express from "express";
import { StockController } from "./stock.controller";
const router=express.Router()

router.get("/",StockController.getAllStocks)

export const StockRoutes=router