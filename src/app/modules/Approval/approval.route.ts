import express from "express";
import auth from "../../middlewares/auth";
import checkPermission from "../../middlewares/checkPermission";
import validateRequest from "../../middlewares/validateRequest";
import { ApprovalController } from "./approval.controller";
import { ApprovalValidation } from "./approval.validation";

const router = express.Router();

// Requests
router.get(
  "/requests",
  auth(),
  checkPermission("approval.view"),
  ApprovalController.getAllApprovalRequests
);

router.get(
  "/requests/:id",
  auth(),
  checkPermission("approval.view"),
  ApprovalController.getApprovalRequestById
);

router.post(
  "/requests/:id/action",
  auth(),
  checkPermission("approval.action"),
  validateRequest(ApprovalValidation.actionApprovalRequestZodSchema),
  ApprovalController.actionApprovalRequest
);

// Policies
router.get(
  "/policies",
  auth(),
  checkPermission("approval.manage_policy"),
  ApprovalController.getAllPolicies
);

router.get(
  "/policies/:id",
  auth(),
  checkPermission("approval.manage_policy"),
  ApprovalController.getPolicyById
);

router.post(
  "/policies",
  auth(),
  checkPermission("approval.manage_policy"),
  validateRequest(ApprovalValidation.createPolicyZodSchema),
  ApprovalController.createPolicy
);

router.patch(
  "/policies/:id",
  auth(),
  checkPermission("approval.manage_policy"),
  validateRequest(ApprovalValidation.updatePolicyZodSchema),
  ApprovalController.updatePolicy
);

router.delete(
  "/policies/:id",
  auth(),
  checkPermission("approval.manage_policy"),
  ApprovalController.deletePolicy
);

export const ApprovalRoutes = router;
