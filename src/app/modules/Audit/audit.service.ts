import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../helpers/queryBuilder";

const getAllAuditLogs = async (query: Record<string, unknown>) => {
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
  const log = await prisma.auditLog.findUnique({
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

  if (!log) {
    throw new ApiError(httpStatus.NOT_FOUND, "Audit log record not found!");
  }

  return log;
};

export const AuditService = {
  getAllAuditLogs,
  getAuditLogById,
};
