import { AuditAction } from "@prisma/client";

export interface ICreateAuditLogPayload {
  actorId?: string;
  action: AuditAction | string;
  module: string;
  entityType: string;
  entityId: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface IAuditLogQuery {
  [key: string]: unknown;
  action?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  approvalRequired?: boolean;
  approvalBypassed?: boolean;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
