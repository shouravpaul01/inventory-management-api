import express from "express";
import { StockController } from "./stock.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { updateStockQuantityValidation } from "./stock.validation";
import { upload, uploadMultipleImages, uploadImagesByFields } from "../../config/multer.config";
import parseData from "../../middlewares/parseData";
import auth from "../../middlewares/auth";
import { USER_ROLE } from "../user/user.constent";
import type { RequestHandler } from "express";
const router = express.Router();



router.post(
  "/create-stock/:stockId",
  uploadImagesByFields([{ name: "documentImages", maxCount: 3 },{ name: "locatedImages", maxCount: 3 }]) as RequestHandler,
  parseData,
  validateRequest(updateStockQuantityValidation),
  StockController.createStock
);
router.get("/", StockController.getAllStocks);
router.patch(
  "/update-approved-status",
  auth(USER_ROLE.Admin),
  StockController.updateStockApprovedStatus
);
router.get("/single-stock", StockController.getSingleStock),
  router.patch(
    "/update-stock",
    auth(USER_ROLE.Admin),
    uploadImagesByFields([
      { name: "documentImages", maxCount: 3 },
      { name: "locatedImages", maxCount: 3 },
    ]) as RequestHandler,
    parseData,
    validateRequest(updateStockQuantityValidation),
    StockController.updateStock
  );
export const StockRoutes = router;
