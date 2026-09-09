import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../helpers/queryBuilder";
import { NotificationType } from "@prisma/client";

const toValidObjectId = (id?: string | null): string | undefined => {
  if (id && /^[0-9a-fA-F]{24}$/.test(id)) {
    return id;
  }
  return undefined;
};

// ════════════════════════════════════════════════════════════
// 1. CREATE NOTIFICATION
// ════════════════════════════════════════════════════════════

const createNotification = async (payload: {
  userId: string;
  type: "SYSTEM" | "APPROVAL" | "REQUISITION" | "DISTRIBUTION" | "RETURN" | "DELIVERY" | "STOCK" | "ALERT";
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
}) => {
  const notification = await prisma.notification.create({
    data: {
      userId: payload.userId,
      type: payload.type as NotificationType,
      title: payload.title,
      message: payload.message,
      referenceType: payload.referenceType,
      referenceId: toValidObjectId(payload.referenceId),
    },
  });

  return notification;
};

// ════════════════════════════════════════════════════════════
// 2. GET USER NOTIFICATIONS
// ════════════════════════════════════════════════════════════

const getMyNotifications = async (userId: string, query: Record<string, unknown>) => {
  const modifiedQuery = { ...query, userId };

  const queryBuilder = new QueryBuilder(prisma.notification as any, modifiedQuery, {
    fields: {
      userId: { type: "string", filterable: true },
      type: { type: "string", filterable: true, sortable: true },
      isRead: { type: "boolean", filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .filter()
    .sort()
    .paginate();

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return { meta: { ...meta, unreadCount }, data };
};

// ════════════════════════════════════════════════════════════
// 3. MARK NOTIFICATION AS READ
// ════════════════════════════════════════════════════════════

const markAsRead = async (id: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, "Notification not found!");
  }

  if (notification.userId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Access denied to notification.");
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return updated;
};

// ════════════════════════════════════════════════════════════
// 4. MARK ALL AS READ
// ════════════════════════════════════════════════════════════

const markAllAsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { message: "All notifications marked as read", count: result.count };
};

export const NotificationService = {
  createNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
