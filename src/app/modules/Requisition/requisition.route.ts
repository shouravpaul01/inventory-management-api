import express from "express";
import auth from "../../middlewares/auth";
import checkPermission from "../../middlewares/checkPermission";
import validateRequest from "../../middlewares/validateRequest";
import { RequisitionController } from "./requisition.controller";
import { RequisitionValidation } from "./requisition.validation";

const router = express.Router();

router.post(
  "/",
  auth(),
  checkPermission("requisition.create"),
  validateRequest(RequisitionValidation.createRequisitionZodSchema),
  RequisitionController.createRequisition
);

router.get(
  "/",
  auth(),
  checkPermission("requisition.view"),
  RequisitionController.getAllRequisitions
);

router.get(
  "/:id",
  auth(),
  checkPermission("requisition.view"),
  RequisitionController.getRequisitionById
);

router.patch(
  "/:id",
  auth(),
  checkPermission("requisition.update"),
  validateRequest(RequisitionValidation.updateRequisitionZodSchema),
  RequisitionController.updateRequisition
);

router.post(
  "/:id/submit",
  auth(),
  checkPermission("requisition.submit"),
  RequisitionController.submitRequisition
);

router.post(
  "/:id/review",
  auth(),
  checkPermission("requisition.approve"),
  validateRequest(RequisitionValidation.reviewRequisitionZodSchema),
  RequisitionController.reviewRequisition
);

router.post(
  "/:id/cancel",
  auth(),
  checkPermission("requisition.cancel"),
  RequisitionController.cancelRequisition
);

router.delete(
  "/:id",
  auth(),
  checkPermission("requisition.cancel"),
  RequisitionController.deleteRequisition
);

export const RequisitionRoutes = router;
