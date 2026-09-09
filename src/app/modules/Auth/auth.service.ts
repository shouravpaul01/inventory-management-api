import bcrypt from "bcrypt";
import httpStatus from "http-status";
import { Secret } from "jsonwebtoken";
import { env } from "../../../config/env.config";
import ApiError from "../../../errors/ApiErrors";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import { calculateEffectivePermissions } from "../../../helpers/permissionHelpers";
import prisma from "../../../shared/prisma";
import { IChangePasswordPayload, ILoginPayload } from "./auth.interface";
import {
  AuthUtils,
  calculateLockoutExpiry,
  getRemainingLockoutMinutes,
  setTokenCookies,
} from "./auth.utils";

const login = async (
  payload: ILoginPayload,
  res: any
) => {
  const identifier = payload.email || payload.username;
  if (!identifier) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email or username is required!");
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { username: identifier },
        { employeeId: identifier },
      ],
    },
    include: {
      auth: true,
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
    },
  });

  if (!user || !user.auth) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid credentials!");
  }

  if (user.status !== "ACTIVE") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `Your account is ${user.status.toLowerCase()}! Please contact your administrator.`
    );
  }

  // Check account lockout
  if (user.auth.lockedUntil && user.auth.lockedUntil > new Date()) {
    const minutesLeft = getRemainingLockoutMinutes(user.auth.lockedUntil);
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `Account is temporarily locked due to consecutive failed attempts. Try again in ${minutesLeft} minute(s).`
    );
  }

  const isPasswordValid = await bcrypt.compare(
    payload.password,
    user.auth.password
  );

  if (!isPasswordValid) {
    const failedCount = user.auth.failedLoginCount + 1;
    const shouldLock = failedCount >= 5;

    await prisma.userAuth.update({
      where: { userId: user.id },
      data: {
        failedLoginCount: failedCount,
        lockedUntil: shouldLock ? calculateLockoutExpiry(15) : null,
      },
    });

    if (shouldLock) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "Account locked for 15 minutes due to 5 consecutive failed login attempts."
      );
    }

    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid credentials!");
  }

  // Reset failed attempts & record last login
  await prisma.userAuth.update({
    where: { userId: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  const userRoleCodes = user.roles.map((ur) => ur.role.code);
  const effectivePermissions = calculateEffectivePermissions(user as any);

  const authUserPayload = {
    id: user.id,
    employeeId: user.employeeId,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isSuperAdmin: user.isSuperAdmin,
    departmentId: user.departmentId,
    roles: userRoleCodes,
    permissions: effectivePermissions,
  };

  const tokens = AuthUtils.setTokenCookies(res, authUserPayload);

  return {
    user: {
      id: user.id,
      employeeId: user.employeeId,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      isSuperAdmin: user.isSuperAdmin,
      status: user.status,
      department: user.department,
      roles: userRoleCodes,
      permissions: effectivePermissions,
    },
    ...tokens,
  };
};

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
          emailVerifiedAt: true,
          passwordChangedAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User profile not found!");
  }

  const userRoleCodes = user.roles.map((ur) => ur.role.code);
  const effectivePermissions = calculateEffectivePermissions(user as any);

  return {
    id: user.id,
    employeeId: user.employeeId,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    isSuperAdmin: user.isSuperAdmin,
    status: user.status,
    department: user.department,
    roles: userRoleCodes,
    permissions: effectivePermissions,
    authInfo: user.auth,
  };
};

const refreshToken = async (token: string, res: any) => {
  const verified = jwtHelpers.verifyToken(
    token,
    env.REFRESH_TOKEN_SECRET as Secret
  );

  const userId = (verified as any).id || (verified as any).userId;
  const user = await getMe(userId);

  if (!user || user.status !== "ACTIVE") {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User is no longer active!");
  }

  const authUserPayload = {
    id: user.id,
    employeeId: user.employeeId,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isSuperAdmin: user.isSuperAdmin,
    departmentId: user.department?.id,
    roles: user.roles,
    permissions: user.permissions,
  };

  const tokens = AuthUtils.setTokenCookies(res, authUserPayload);

  return tokens;
};

const changePassword = async (
  userId: string,
  payload: IChangePasswordPayload
) => {
  const auth = await prisma.userAuth.findUnique({
    where: { userId },
  });

  if (!auth) {
    throw new ApiError(httpStatus.NOT_FOUND, "User authentication data not found!");
  }

  const isMatch = await bcrypt.compare(payload.oldPassword, auth.password);
  if (!isMatch) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Current password is incorrect!");
  }

  const newHashedPassword = await bcrypt.hash(payload.newPassword, 12);

  await prisma.userAuth.update({
    where: { userId },
    data: {
      password: newHashedPassword,
      passwordChangedAt: new Date(),
    },
  });

  return { message: "Password updated successfully!" };
};

export const AuthService = {
  login,
  getMe,
  refreshToken,
  changePassword,
};
