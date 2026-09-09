import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../helpers/queryBuilder";
import { NotificationType } from "@prisma/client";
import {
  IBulkNotificationPayload,
  ICreateNotificationPayload,
  IDepartmentNotificationPayload,
  IRoleNotificationPayload,
} from "./notification.interface";
import { NotificationUtils } from "./notification.utils";
import { emitToDepartment, emitToRole, emitToUser, emitToUsers } from "../../../shared/socket";

// ════════════════════════════════════════════════════════════
// 1. CREATE NOTIFICATION (SINGLE)
// ════════════════════════════════════════════════════════════

const createNotification = async (payload: ICreateNotificationPayload) => {
  const notification = await prisma.notification.create({
    data: {
      userId: payload.userId,
      type: payload.type as NotificationType,
      title: payload.title,
      message: payload.message,
      referenceType: payload.referenceType,
      referenceId: NotificationUtils.toValidObjectId(payload.referenceId),
    },
  });

  // Calculate updated unread count for the recipient
  const unreadCount = await prisma.notification.count({
    where: { userId: payload.userId, isRead: false },
  });

  // Real-time Socket.io dispatch
  emitToUser(payload.userId, "new_notification", {
    notification,
    unreadCount,
  });
  emitToUser(payload.userId, "unread_count_update", { unreadCount });

  return notification;
};

// ════════════════════════════════════════════════════════════
// 2. CREATE NOTIFICATIONS (BULK USERS)
// ════════════════════════════════════════════════════════════

const createNotificationsForUsers = async (payload: IBulkNotificationPayload) => {
  const uniqueUserIds = Array.from(new Set(payload.userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) return [];

  const createdNotifications = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const notif = await prisma.notification.create({
        data: {
          userId,
          type: payload.type as NotificationType,
          title: payload.title,
          message: payload.message,
          referenceType: payload.referenceType,
          referenceId: NotificationUtils.toValidObjectId(payload.referenceId),
        },
      });

      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false },
      });

      // Emit real-time notification to individual user room
      emitToUser(userId, "new_notification", {
        notification: notif,
        unreadCount,
      });
      emitToUser(userId, "unread_count_update", { unreadCount });

      return notif;
    })
  );

  return createdNotifications;
};

// ════════════════════════════════════════════════════════════
// 3. NOTIFY BY ROLE (E.G. SUPER_ADMIN, INVENTORY_MANAGER)
// ════════════════════════════════════════════════════════════

const notifyRole = async (payload: IRoleNotificationPayload) => {
  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      roles: {
        some: {
          role: { code: payload.roleCode },
        },
      },
    },
    select: { id: true },
  });

  const userIds = users.map((u) => u.id);

  // Broadcast to the role-specific socket room
  emitToRole(payload.roleCode, "role_alert", {
    type: payload.type,
    title: payload.title,
    message: payload.message,
    referenceType: payload.referenceType,
    referenceId: payload.referenceId,
  });

  if (userIds.length > 0) {
    return createNotificationsForUsers({
      userIds,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      referenceType: payload.referenceType,
      referenceId: payload.referenceId,
    });
  }

  return [];
};

// ════════════════════════════════════════════════════════════
// 4. NOTIFY BY DEPARTMENT
// ════════════════════════════════════════════════════════════

const notifyDepartment = async (payload: IDepartmentNotificationPayload) => {
  const users = await prisma.user.findMany({
    where: {
      departmentId: payload.departmentId,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const userIds = users.map((u) => u.id);

  // Broadcast to the department socket room
  emitToDepartment(payload.departmentId, "department_alert", {
    type: payload.type,
    title: payload.title,
    message: payload.message,
    referenceType: payload.referenceType,
    referenceId: payload.referenceId,
  });

  if (userIds.length > 0) {
    return createNotificationsForUsers({
      userIds,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      referenceType: payload.referenceType,
      referenceId: payload.referenceId,
    });
  }

  return [];
};

// ════════════════════════════════════════════════════════════
// 5. GET USER NOTIFICATIONS
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
// 6. GET UNREAD COUNT
// ════════════════════════════════════════════════════════════

const getUnreadCount = async (userId: string): Promise<number> => {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
};

// ════════════════════════════════════════════════════════════
// 7. MARK NOTIFICATION AS READ
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

  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  // Real-time update for badge / notifications
  emitToUser(userId, "notification_read", { id, unreadCount });
  emitToUser(userId, "unread_count_update", { unreadCount });

  return updated;
};

// ════════════════════════════════════════════════════════════
// 8. MARK ALL AS READ
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

  // Real-time update for badge / notifications
  emitToUser(userId, "all_notifications_read", { unreadCount: 0 });
  emitToUser(userId, "unread_count_update", { unreadCount: 0 });

  return { message: "All notifications marked as read", count: result.count };
};

export const NotificationService = {
  createNotification,
  createNotificationsForUsers,
  notifyRole,
  notifyDepartment,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
