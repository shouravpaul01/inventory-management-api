import { AuditAction, Prisma } from "@prisma/client";

export interface IAuditLogPayload<T = any> {
  action: AuditAction | string;
  module: string;
  entityType: string;
  entityId: string;
  actorId?: string;
  ipAddress?: string;
  userAgent?: string;
  beforeData?: T | Record<string, unknown> | null;
  afterData?: T | Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  approvalRequired?: boolean;
  approvalRequestId?: string;
  approvalBypassed?: boolean;
  bypassReason?: string;
  tx?: Prisma.TransactionClient;
  failSilently?: boolean;
}

// Backward compatibility alias
export type ICreateAuditLogPayload = IAuditLogPayload;

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
