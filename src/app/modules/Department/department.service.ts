import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../helpers/queryBuilder";
import prisma from "../../../shared/prisma";

const createDepartment = async (
  payload: { name: string; code: string; description?: string },
  creatorId?: string
) => {
  const existing = await prisma.department.findUnique({
    where: { code: payload.code },
  });

  if (existing) {
    throw new ApiError(
      httpStatus.CONFLICT,
      `Department code '${payload.code}' already exists!`
    );
  }

  const department = await prisma.department.create({
    data: payload,
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: creatorId,
      action: "CREATE",
      module: "Department",
      entityType: "Department",
      entityId: department.id,
      afterData: department as any,
    },
  });

  return department;
};

const getAllDepartments = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.department as any, query, {
    fields: {
      name: { type: "string", searchable: true, sortable: true, filterable: true },
      code: { type: "string", searchable: true, sortable: true, filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["name", "code", "description"])
    .filter()
    .sort()
    .paginate()
    .include({
      _count: {
        select: {
          users: true,
        },
      },
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const getDepartmentById = async (id: string) => {
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          employeeId: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
        },
      },
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  if (!department) {
    throw new ApiError(httpStatus.NOT_FOUND, "Department not found!");
  }

  return department;
};

const updateDepartment = async (
  id: string,
  payload: { name?: string; description?: string },
  actorId?: string
) => {
  const before = await getDepartmentById(id);

  const updated = await prisma.department.update({
    where: { id },
    data: payload,
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "UPDATE",
      module: "Department",
      entityType: "Department",
      entityId: id,
      beforeData: before as any,
      afterData: updated as any,
    },
  });

  return updated;
};

const deleteDepartment = async (id: string, actorId?: string) => {
  const department = await getDepartmentById(id);

  const userCount = await prisma.user.count({
    where: { departmentId: id },
  });

  if (userCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete department because it has ${userCount} associated user(s)! Reassign them first.`
    );
  }

  await prisma.department.delete({
    where: { id },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "DELETE",
      module: "Department",
      entityType: "Department",
      entityId: id,
      beforeData: department as any,
    },
  });

  return { message: "Department deleted successfully!" };
};

export const DepartmentService = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
};
