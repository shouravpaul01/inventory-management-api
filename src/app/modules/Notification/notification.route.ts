import express from "express";
import auth from "../../middlewares/auth";
import { NotificationController } from "./notification.controller";

const router = express.Router();

router.get(
  "/",
  auth(),
  NotificationController.getMyNotifications
);

router.get(
  "/unread-count",
  auth(),
  NotificationController.getUnreadCount
);

router.patch(
  "/mark-all-read",
  auth(),
  NotificationController.markAllAsRead
);

router.patch(
  "/:id/read",
  auth(),
  NotificationController.markAsRead
);

export const NotificationRoutes = router;

