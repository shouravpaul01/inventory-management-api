import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../helpers/queryBuilder";
import prisma from "../../../shared/prisma";

const getAllRoles = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.role as any, query, {
    fields: {
      name: { type: "string", searchable: true, sortable: true, filterable: true },
      code: { type: "string", searchable: true, sortable: true, filterable: true },
      isSystemRole: { type: "boolean", sortable: true, filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["name", "code", "description"])
    .filter()
    .sort()
    .paginate()
    .include({
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: {
          users: true,
          permissions: true,
        },
      },
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const getRoleById = async (id: string) => {
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, "Role not found!");
  }

  return role;
};

const createRole = async (payload: {
  name: string;
  code: string;
  description?: string;
  permissionIds?: string[];
}) => {
  const existing = await prisma.role.findUnique({
    where: { code: payload.code },
  });

  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, `Role code '${payload.code}' already exists!`);
  }

  const role = await prisma.role.create({
    data: {
      name: payload.name,
      code: payload.code,
      description: payload.description,
      isSystemRole: false,
    },
  });

  if (payload.permissionIds && payload.permissionIds.length > 0) {
    for (const permissionId of payload.permissionIds) {
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId,
        },
      });
    }
  }

  return getRoleById(role.id);
};

const updateRole = async (
  id: string,
  payload: { name?: string; description?: string }
) => {
  await getRoleById(id);

  const updated = await prisma.role.update({
    where: { id },
    data: payload,
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  return updated;
};

const deleteRole = async (id: string) => {
  const role = await getRoleById(id);

  if (role.isSystemRole) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "System protected roles cannot be deleted!"
    );
  }

  const userCount = await prisma.userRole.count({
    where: { roleId: id },
  });

  if (userCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete role because it is assigned to ${userCount} active user(s)!`
    );
  }

  await prisma.rolePermission.deleteMany({
    where: { roleId: id },
  });

  await prisma.role.delete({
    where: { id },
  });

  return { message: "Role deleted successfully!" };
};

const getAllPermissions = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.permission as any, query, {
    fields: {
      name: { type: "string", searchable: true, sortable: true, filterable: true },
      code: { type: "string", searchable: true, sortable: true, filterable: true },
      module: { type: "string", searchable: true, sortable: true, filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["name", "code", "module", "description"])
    .filter()
    .sort()
    .paginate();

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const assignRolePermissions = async (
  roleId: string,
  permissionIds: string[]
) => {
  await getRoleById(roleId);

  // Validate all permissionIds exist
  const existingPerms = await prisma.permission.findMany({
    where: { id: { in: permissionIds } },
  });

  if (existingPerms.length !== permissionIds.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "One or more provided permission IDs are invalid!"
    );
  }

  // Clear existing role permissions and reassign
  await prisma.rolePermission.deleteMany({
    where: { roleId },
  });

  for (const permId of permissionIds) {
    await prisma.rolePermission.create({
      data: {
        roleId,
        permissionId: permId,
      },
    });
  }

  return getRoleById(roleId);
};

export const RbacService = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions,
  assignRolePermissions,
};
