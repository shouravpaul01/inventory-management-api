import express from "express";
import auth from "../../middlewares/auth";
import checkPermission from "../../middlewares/checkPermission";
import { NotificationController } from "./notification.controller";

const router = express.Router();

router.get(
  "/",
  auth(),
  checkPermission("notification.view"),
  NotificationController.getMyNotifications
);

router.patch(
  "/mark-all-read",
  auth(),
  checkPermission("notification.update"),
  NotificationController.markAllAsRead
);

router.patch(
  "/:id/read",
  auth(),
  checkPermission("notification.update"),
  NotificationController.markAsRead
);

export const NotificationRoutes = router;
