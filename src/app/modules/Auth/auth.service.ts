import bcrypt from "bcrypt";
import httpStatus from "http-status";
import { Secret } from "jsonwebtoken";
import { env } from "../../../config/env.config";
import ApiError from "../../../errors/ApiErrors";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import { calculateEffectivePermissions } from "../../../helpers/permissionHelpers";
import prisma from "../../../shared/prisma";
import crypto from "crypto";
import redis from "../../../shared/redis";
import { EmailQueueService } from "../../../services/Email/email.service";
import { getOtpEmailTemplate } from "../../../utils/emailTemplate";
import { generateOtp } from "../../../utils/generateOtp";
import {
  IChangePasswordPayload,
  IForgotPasswordPayload,
  ILoginPayload,
  IResetPasswordPayload,
  IVerifyResetOtpPayload,
} from "./auth.interface";
import {
  AuthUtils,
  calculateLockoutExpiry,
  getRemainingLockoutMinutes,
  setTokenCookies,
} from "./auth.utils";
import { AuditAction } from "@prisma/client";
import { AuditService } from "../Audit/audit.service";

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

    await AuditService.logAction(AuditAction.LOGIN_FAILED, {
      module: "Auth",
      entityType: "User",
      entityId: user.id,
      actorId: user.id,
      metadata: { identifier, failedAttempts: failedCount },
    });

    if (shouldLock) {
      await AuditService.logAction(AuditAction.ACCOUNT_LOCK, {
        module: "Auth",
        entityType: "User",
        entityId: user.id,
        actorId: user.id,
        metadata: { reason: "5 consecutive failed login attempts", lockoutDurationMinutes: 15 },
      });

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

  await AuditService.logAction(AuditAction.LOGIN, {
    module: "Auth",
    entityType: "User",
    entityId: user.id,
    actorId: user.id,
    metadata: { username: user.username, email: user.email },
  });

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

  await AuditService.logAction(AuditAction.PASSWORD_CHANGE, {
    module: "Auth",
    entityType: "User",
    entityId: userId,
    actorId: userId,
    metadata: { changedAt: new Date() },
  });

  return { message: "Password updated successfully!" };
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
  const email = payload.email.toLowerCase().trim();

  // 1. Check if user exists and is active
  const user = await prisma.user.findUnique({
    where: { email },
    include: { auth: true },
  });

  if (!user || !user.auth) {
    throw new ApiError(httpStatus.NOT_FOUND, "No account found with this email address!");
  }

  if (user.status !== "ACTIVE") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `Account is ${user.status.toLowerCase()}! Please contact your administrator.`
    );
  }

  // 2. Rate limit cooldown (60 seconds per email) to prevent spamming
  const rateLimitKey = `otp:rate:${email}`;
  const isRateLimited = await redis.get(rateLimitKey);
  if (isRateLimited) {
    const ttl = await redis.ttl(rateLimitKey);
    throw new ApiError(
      httpStatus.TOO_MANY_REQUESTS,
      `Please wait ${ttl > 0 ? ttl : 60} seconds before requesting another OTP.`
    );
  }

  // 3. Generate a secure 6-digit numeric OTP using utils
  const otp = generateOtp();

  // 4. Store in Redis with 5 minutes (300s) expiration
  const otpKey = `otp:reset:${email}`;
  await redis.set(otpKey, otp, "EX", 300);
  await redis.set(rateLimitKey, "1", "EX", 60);

  // 5. Generate template from utils and dispatch email via BullMQ queue service
  const emailHtml = getOtpEmailTemplate({
    name: user.firstName,
    otp,
    expiresInMinutes: 5,
  });

  await EmailQueueService.sendEmailViaQueue({
    to: email,
    subject: "Password Reset Verification Code",
    html: emailHtml,
  });

  return {
    message: "Password reset OTP sent to your email successfully.",
    expiresIn: 300,
  };
};

const verifyResetOtp = async (payload: IVerifyResetOtpPayload) => {
  const email = payload.email.toLowerCase().trim();
  const otpKey = `otp:reset:${email}`;

  const storedOtp = await redis.get(otpKey);

  if (!storedOtp) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "OTP has expired or was not requested. Please request a new one."
    );
  }

  if (storedOtp !== payload.otp.trim()) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid OTP code!");
  }

  // Consume OTP
  await redis.del(otpKey);

  // Generate secure reset token with 15 minutes validity
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenKey = `reset_token:${resetToken}`;
  await redis.set(tokenKey, email, "EX", 900);

  return {
    message: "OTP verified successfully.",
    resetToken,
    expiresIn: 900,
  };
};

const resetPassword = async (payload: IResetPasswordPayload) => {
  const tokenKey = `reset_token:${payload.resetToken}`;
  const email = await redis.get(tokenKey);

  if (!email) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Password reset session has expired or is invalid. Please request a new OTP."
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { auth: true },
  });

  if (!user || !user.auth) {
    throw new ApiError(httpStatus.NOT_FOUND, "User account not found!");
  }

  const newHashedPassword = await bcrypt.hash(payload.newPassword, 12);

  await prisma.userAuth.update({
    where: { userId: user.id },
    data: {
      password: newHashedPassword,
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  // Consume reset token
  await redis.del(tokenKey);

  // Record audit log
  await AuditService.logAction(AuditAction.PASSWORD_RESET, {
    module: "Auth",
    entityType: "User",
    entityId: user.id,
    actorId: user.id,
    metadata: { email, resetAt: new Date() },
  });

  return { message: "Password has been reset successfully! You may now log in." };
};

export const AuthService = {
  login,
  getMe,
  refreshToken,
  changePassword,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};
