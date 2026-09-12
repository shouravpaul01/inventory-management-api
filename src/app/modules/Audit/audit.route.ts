import express from "express";
import auth from "../../middlewares/auth";
import checkPermission from "../../middlewares/checkPermission";
import { AuditController } from "./audit.controller";

const router = express.Router();

router.get(
  "/",
  auth(),
  checkPermission("audit.view"),
  AuditController.getAllAuditLogs
);

router.get(
  "/:id",
  auth(),
  checkPermission("audit.view"),
  AuditController.getAuditLogById
);

export const AuditRoutes = router;
