import { NotificationType } from "@prisma/client";

export interface ICreateNotificationPayload {
  userId: string;
  type: "SYSTEM" | "APPROVAL" | "REQUISITION" | "DISTRIBUTION" | "RETURN" | "DELIVERY" | "STOCK" | "ALERT" | NotificationType;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
}

export interface INotificationQuery {
  userId?: string;
  type?: string;
  isRead?: boolean;
}
