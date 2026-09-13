import express from "express";
import auth from "../../middlewares/auth";
import checkPermission from "../../middlewares/checkPermission";
import validateRequest from "../../middlewares/validateRequest";
import { fileUploader } from "../../middlewares/fileUploader";
import { parseBodyData } from "../../middlewares/parseBodyData";
import { ReturnController } from "./return.controller";
import { ReturnValidation } from "./return.validation";

const router = express.Router();

router.post(
  "/",
  auth(),
  checkPermission("return.create"),
  fileUploader.single("photo"),
  parseBodyData,
  validateRequest(ReturnValidation.processReturnZodSchema),
  ReturnController.processReturn
);

router.get(
  "/",
  auth(),
  checkPermission("return.view"),
  ReturnController.getAllReturns
);

router.get(
  "/:id",
  auth(),
  checkPermission("return.view"),
  ReturnController.getReturnById
);

export const ReturnRoutes = router;
