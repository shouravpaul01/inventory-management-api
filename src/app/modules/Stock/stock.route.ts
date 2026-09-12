import express from "express";
import auth from "../../middlewares/auth";
import checkPermission from "../../middlewares/checkPermission";
import validateRequest from "../../middlewares/validateRequest";
import { fileUploader } from "../../middlewares/fileUploader";
import { parseBodyData } from "../../middlewares/parseBodyData";
import { StockController } from "./stock.controller";
import { StockValidation } from "./stock.validation";

const router = express.Router();

router.get(
  "/balances",
  auth(),
  checkPermission("stock.view"),
  StockController.getAllStockBalances
);

router.get(
  "/movements",
  auth(),
  checkPermission("stock.view"),
  StockController.getAllStockMovements
);

router.post(
  "/in",
  auth(),
  checkPermission("stock.in"),
  fileUploader.single("photo"),
  parseBodyData,
  validateRequest(StockValidation.stockInZodSchema),
  StockController.stockIn
);

router.post(
  "/out",
  auth(),
  checkPermission("stock.out"),
  fileUploader.single("photo"),
  parseBodyData,
  validateRequest(StockValidation.stockOutZodSchema),
  StockController.stockOut
);

router.post(
  "/transfer",
  auth(),
  checkPermission("stock.transfer"),
  fileUploader.single("photo"),
  parseBodyData,
  validateRequest(StockValidation.transferStockZodSchema),
  StockController.transferStock
);

router.post(
  "/adjust",
  auth(),
  checkPermission("stock.adjust"),
  fileUploader.single("photo"),
  parseBodyData,
  validateRequest(StockValidation.adjustStockZodSchema),
  StockController.adjustStock
);

router.post(
  "/reserve",
  auth(),
  checkPermission("stock.adjust"),
  validateRequest(StockValidation.reserveStockZodSchema),
  StockController.reserveStock
);

router.post(
  "/release-reservation",
  auth(),
  checkPermission("stock.adjust"),
  validateRequest(StockValidation.releaseReservationZodSchema),
  StockController.releaseReservation
);

export const StockRoutes = router;
