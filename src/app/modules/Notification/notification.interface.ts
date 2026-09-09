import { NotificationType } from "@prisma/client";

export type NotificationTypeInput =
  | "SYSTEM"
  | "APPROVAL"
  | "REQUISITION"
  | "DISTRIBUTION"
  | "RETURN"
  | "DELIVERY"
  | "STOCK"
  | "ALERT"
  | NotificationType;

export interface ICreateNotificationPayload {
  userId: string;
  type: NotificationTypeInput;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
}

export interface IBulkNotificationPayload {
  userIds: string[];
  type: NotificationTypeInput;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
}

export interface IRoleNotificationPayload {
  roleCode: string;
  type: NotificationTypeInput;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
}

export interface IDepartmentNotificationPayload {
  departmentId: string;
  type: NotificationTypeInput;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
}

export interface INotificationQuery {
  [key: string]: unknown;
  userId?: string;
  type?: string;
  isRead?: boolean;
}

export interface INotificationSocketPayload {
  notification: any;
  unreadCount: number;
}
