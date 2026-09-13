import express from "express";
import auth from "../../middlewares/auth";
import checkPermission from "../../middlewares/checkPermission";
import validateRequest from "../../middlewares/validateRequest";
import { fileUploader } from "../../middlewares/fileUploader";
import { parseBodyData } from "../../middlewares/parseBodyData";
import { DistributionController } from "./distribution.controller";
import { DistributionValidation } from "./distribution.validation";

const router = express.Router();

router.post(
  "/",
  auth(),
  checkPermission("distribution.create"),
  validateRequest(DistributionValidation.createDistributionZodSchema),
  DistributionController.createDistribution
);

router.post(
  "/:id/confirm-delivery",
  auth(),
  checkPermission("distribution.confirm_delivery"),
  fileUploader.single("signature"),
  parseBodyData,
  validateRequest(DistributionValidation.confirmDeliveryZodSchema),
  DistributionController.confirmDelivery
);

router.get(
  "/",
  auth(),
  checkPermission("distribution.view"),
  DistributionController.getAllDistributions
);

router.get(
  "/:id",
  auth(),
  checkPermission("distribution.view"),
  DistributionController.getDistributionById
);

export const DistributionRoutes = router;
