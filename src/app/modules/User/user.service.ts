import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../helpers/queryBuilder";
import prisma from "../../../shared/prisma";
import {
  ICreateUserPayload,
  IPermissionOverrideItem,
  IUpdateUserPayload,
  UserStatusType,
} from "./user.interface";
import { hashPassword, validateUniqueUserFields } from "./user.utils";

const createUser = async (
  payload: ICreateUserPayload,
  creatorId?: string
) => {
  // 1. Validate department
  const dept = await prisma.department.findUnique({
    where: { id: payload.departmentId },
  });

  if (!dept) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Specified department does not exist!");
  }

  // 2. Check unique constraints
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { employeeId: payload.employeeId },
        { username: payload.username },
        { email: payload.email },
      ],
    },
  });

  if (existingUser) {
    validateUniqueUserFields(existingUser, payload);
  }

  // 3. Hash password
  const hashedPassword = await hashPassword(payload.password);

  // 4. Create user with UserAuth
  const newUser = await prisma.user.create({
    data: {
      employeeId: payload.employeeId,
      username: payload.username,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      departmentId: payload.departmentId,
      createdById: creatorId,
      status: "ACTIVE",
      auth: {
        create: {
          password: hashedPassword,
          emailVerifiedAt: new Date(),
        },
      },
    },
    include: {
      department: true,
    },
  });

  // 5. Assign roles if provided
  if (payload.roleIds && payload.roleIds.length > 0) {
    for (const roleId of payload.roleIds) {
      await prisma.userRole.create({
        data: {
          userId: newUser.id,
          roleId,
          assignedById: creatorId,
        },
      });
    }
  }

  return getUserById(newUser.id);
};

const getAllUsers = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.user as any, query, {
    fields: {
      firstName: { type: "string", searchable: true, sortable: true, filterable: true },
      lastName: { type: "string", searchable: true, sortable: true, filterable: true },
      username: { type: "string", searchable: true, sortable: true, filterable: true },
      email: { type: "string", searchable: true, sortable: true, filterable: true },
      employeeId: { type: "string", searchable: true, sortable: true, filterable: true },
      status: { type: "string", sortable: true, filterable: true },
      isSuperAdmin: { type: "boolean", sortable: true, filterable: true },
      departmentId: { type: "string", filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["firstName", "lastName", "username", "email", "employeeId"])
    .filter()
    .sort()
    .paginate()
    .include({
      department: true,
      roles: {
        include: {
          role: true,
        },
      },
      permissions: {
        include: {
          permission: true,
        },
      },
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      department: true,
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      permissions: {
        include: {
          permission: true,
        },
      },
      auth: {
        select: {
          lastLoginAt: true,
          failedLoginCount: true,
          lockedUntil: true,
          passwordChangedAt: true,
          emailVerifiedAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found!");
  }

  return user;
};

const updateUser = async (
  id: string,
  payload: IUpdateUserPayload
) => {
  await getUserById(id);

  if (payload.departmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: payload.departmentId },
    });
    if (!dept) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Department does not exist!");
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: payload,
    include: {
      department: true,
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  return updated;
};

const updateUserStatus = async (
  id: string,
  status: UserStatusType
) => {
  const user = await getUserById(id);

  if (user.isSuperAdmin && status !== "ACTIVE") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Super Administrator account status cannot be deactivated or suspended!"
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status },
    include: {
      department: true,
    },
  });

  return updated;
};

const assignUserRoles = async (
  userId: string,
  roleIds: string[],
  assignedById?: string
) => {
  await getUserById(userId);

  // Validate roles exist
  const existingRoles = await prisma.role.findMany({
    where: { id: { in: roleIds } },
  });

  if (existingRoles.length !== roleIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, "One or more role IDs are invalid!");
  }

  // Remove existing roles and assign new ones
  await prisma.userRole.deleteMany({
    where: { userId },
  });

  for (const roleId of roleIds) {
    await prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedById,
      },
    });
  }

  return getUserById(userId);
};

const overrideUserPermissions = async (
  userId: string,
  overrides: IPermissionOverrideItem[],
  assignedById?: string
) => {
  await getUserById(userId);

  const permissionIds = overrides.map((o) => o.permissionId);
  const existingPerms = await prisma.permission.findMany({
    where: { id: { in: permissionIds } },
  });

  if (existingPerms.length !== permissionIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, "One or more permission IDs are invalid!");
  }

  // Remove existing overrides
  await prisma.userPermissionOverride.deleteMany({
    where: { userId },
  });

  // Create new overrides
  for (const item of overrides) {
    await prisma.userPermissionOverride.create({
      data: {
        userId,
        permissionId: item.permissionId,
        effect: item.effect,
        assignedById,
      },
    });
  }

  return getUserById(userId);
};

export const UserService = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  assignUserRoles,
  overrideUserPermissions,
};