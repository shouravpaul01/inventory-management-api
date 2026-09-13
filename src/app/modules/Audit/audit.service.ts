import httpStatus from "http-status";
import { AuditAction } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../helpers/queryBuilder";
import { RequestContext } from "../../../helpers/requestContext";
import { IAuditLogPayload, IAuditLogQuery } from "./audit.interface";
import { sanitizeAuditSnapshot } from "./audit.utils";

/**
 * Core unified audit logger method.
 * Automatically resolves actorId, ipAddress, userAgent from RequestContext
 * if not explicitly provided, sanitizes snapshots deeply, supports Prisma transactions,
 * and isolates errors so primary business transactions are never broken by logging issues.
 */
const log = async (payload: IAuditLogPayload) => {
  const actorId = payload.actorId || RequestContext.getActorId() || null;
  const ipAddress = payload.ipAddress || RequestContext.getIpAddress() || null;
  const userAgent = payload.userAgent || RequestContext.getUserAgent() || null;

  const client = (payload.tx as any) || prisma;

  try {
    const beforeData = payload.beforeData
      ? sanitizeAuditSnapshot(payload.beforeData)
      : undefined;
    const afterData = payload.afterData
      ? sanitizeAuditSnapshot(payload.afterData)
      : undefined;
    const metadata = payload.metadata
      ? sanitizeAuditSnapshot(payload.metadata)
      : undefined;

    return await client.auditLog.create({
      data: {
        action: payload.action as any,
        module: payload.module,
        entityType: payload.entityType,
        entityId: payload.entityId,
        actorId,
        ipAddress,
        userAgent,
        beforeData: beforeData as any,
        afterData: afterData as any,
        metadata: metadata as any,
        approvalRequired: payload.approvalRequired ?? false,
        approvalRequestId: payload.approvalRequestId,
        approvalBypassed: payload.approvalBypassed ?? false,
        bypassReason: payload.bypassReason,
      },
    });
  } catch (error) {
    console.error(
      `[AUDIT_LOG_ERROR] Failed to record audit log for module '${payload.module}' (${payload.action}):`,
      error
    );

    // Only throw error if the caller explicitly requested strict transactional auditing
    if (payload.failSilently === false) {
      throw error;
    }
    return null;
  }
};

/**
 * Semantic helper: Log entity creation
 */
const logCreate = async (
  params: Omit<IAuditLogPayload, "action"> & { afterData?: Record<string, unknown> }
) => {
  return log({
    ...params,
    action: AuditAction.CREATE,
  });
};

/**
 * Semantic helper: Log entity update with before & after state
 */
const logUpdate = async (
  params: Omit<IAuditLogPayload, "action"> & {
    beforeData?: Record<string, unknown> | null;
    afterData?: Record<string, unknown> | null;
  }
) => {
  return log({
    ...params,
    action: AuditAction.UPDATE,
  });
};

/**
 * Semantic helper: Log entity deletion with before state
 */
const logDelete = async (
  params: Omit<IAuditLogPayload, "action"> & {
    beforeData?: Record<string, unknown> | null;
  }
) => {
  return log({
    ...params,
    action: AuditAction.DELETE,
  });
};

/**
 * Semantic helper: Log custom business action (e.g. STOCK_IN, APPROVE, LOGIN)
 */
const logAction = async (
  action: AuditAction | string,
  params: Omit<IAuditLogPayload, "action">
) => {
  return log({
    ...params,
    action,
  });
};

const getAllAuditLogs = async (query: IAuditLogQuery | Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.auditLog as any, query, {
    fields: {
      action: { type: "string", filterable: true, sortable: true },
      module: { type: "string", filterable: true, sortable: true, searchable: true },
      entityType: { type: "string", filterable: true, sortable: true, searchable: true },
      entityId: { type: "string", filterable: true, searchable: true },
      actorId: { type: "string", filterable: true },
      approvalRequired: { type: "boolean", filterable: true },
      approvalBypassed: { type: "boolean", filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["module", "entityType", "entityId"])
    .filter()
    .sort()
    .paginate()
    .include({
      actor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          username: true,
          employeeId: true,
        },
      },
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const getAuditLogById = async (id: string) => {
  const logRecord = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      actor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          username: true,
        },
      },
    },
  });

  if (!logRecord) {
    throw new ApiError(httpStatus.NOT_FOUND, "Audit log record not found!");
  }

  return logRecord;
};

export const AuditService = {
  log,
  logCreate,
  logUpdate,
  logDelete,
  logAction,
  createAuditLog: log, // Backward compatibility
  getAllAuditLogs,
  getAuditLogById,
};
