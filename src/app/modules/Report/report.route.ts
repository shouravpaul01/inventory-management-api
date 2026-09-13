import express from "express";
import auth from "../../middlewares/auth";
import checkPermission from "../../middlewares/checkPermission";
import { ReportController } from "./report.controller";

const router = express.Router();

router.get(
  "/dashboard",
  auth(),
  checkPermission("report.view"),
  ReportController.getDashboardOverview
);

router.get(
  "/low-stock",
  auth(),
  checkPermission("report.view"),
  ReportController.getLowStockReport
);

router.get(
  "/my-assets",
  auth(),
  ReportController.getMyAssignedAssets
);

router.get(
  "/users/:id/assets",
  auth(),
  checkPermission("report.view"),
  ReportController.getUserAssignedAssets
);

router.get(
  "/overdue-returns",
  auth(),
  checkPermission("report.view"),
  ReportController.getOverdueReturnsReport
);

router.get(
  "/movements-ledger",
  auth(),
  checkPermission("report.view"),
  ReportController.getMovementLedger
);

export const ReportRoutes = router;
