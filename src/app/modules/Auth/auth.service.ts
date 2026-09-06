import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import httpStatus from "http-status";
import prisma from "../../../shared/prisma";

import ApiPathError from "../../../errors/ApiPathError";
import redis from "../../../shared/redis";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import { env } from "../../../config/env.config";
import { AuthUtils } from "./auth.utils";
import { emailQueue } from "../../../services/Email/email.queue";


// ── register ─────────────────────────────────────────

const register = async (payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) => {
  const existing = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (existing) {
    throw new ApiPathError(
      httpStatus.CONFLICT,
      "email",
      "Email already exists.",
    );
  }

  const hashedPassword = await bcrypt.hash(payload.password, 12);
  const { password, ...userData } = payload;

  const user = await prisma.user.create({
    data: {
      ...userData,
      auth: {
        create: { password: hashedPassword },
      },
    },
    select: { id: true, name: true, email: true, role: true },
  });

  // store OTP in Redis — key: otp:register:<email>
  const otp = generateOtp();
  await redis.set(`otp:register:${user.email}`, otp, "EX", 5 * 60);

  await emailQueue.add("sendEmail", {
    to: user.email,
    subject: "Your verification OTP",
    html: `Your OTP is ${otp}. It expires in 5 minutes.`,
  });

  return user;
};

// ── verify OTP (email verification) ──────────────────

const verifyOtp = async (payload: { email: string; otp: string }, res: any) => {
  const storedOtp = await redis.get(`otp:register:${payload.email}`);
  if (!storedOtp || storedOtp !== payload.otp) {
    throw new ApiPathError(
      httpStatus.BAD_REQUEST,
      "otp",
      "Invalid or expired OTP.",
    );
  }

  const user = await prisma.user.update({
    where: { email: payload.email },
    data: { isEmailVerified: true },
    select: { id: true, name: true, email: true, role: true },
  });

  await redis.del(`otp:register:${payload.email}`);

  const tokens = AuthUtils.setTokenCookies(res, user);
  return { user, ...tokens };
};

// ── login ─────────────────────────────────────────────

const login = async (
  payload: { email: string; password: string },
  res: any,
) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    include: { auth: true },
  });

  if (!user || !user.auth) {
    throw new ApiPathError(
      httpStatus.UNAUTHORIZED,
      "email",
      "Invalid credentials.",
    );
  }
  if (user.status === "BLOCKED") {
    throw new ApiPathError(
      httpStatus.FORBIDDEN,
      "email",
      "Your account is blocked.",
    );
  }
  if (!user.isEmailVerified) {
    throw new ApiPathError(
      httpStatus.FORBIDDEN,
      "email",
      "Please verify your email first.",
    );
  }

  const passwordMatch = await bcrypt.compare(
    payload.password,
    user.auth.password,
  );
  if (!passwordMatch) {
    throw new ApiPathError(
      httpStatus.UNAUTHORIZED,
      "password",
      "Invalid credentials.",
    );
  }

  await prisma.userAuth.update({
    where: { userId: user.id },
    data: { lastLoginAt: new Date() },
  });

  const { auth, ...safeUser } = user;
  const tokens = AuthUtils.setTokenCookies(res, user);
  return { user: safeUser, ...tokens };
};

// ── forgot password ───────────────────────────────────

const forgotPassword = async (payload: { email: string }) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (!user) {
    // Don't reveal if email exists — silently succeed
    return { message: "If this email exists, an OTP has been sent." };
  }

  const otp = generateOtp();
  await redis.set(`otp:reset:${payload.email}`, otp, "EX", 10 * 60);

  await emailQueue.add("sendEmail", {
    to: payload.email,
    subject: "Password reset OTP",
    html: `Your password reset OTP is ${otp}. It expires in 10 minutes.`,
  });

  return { message: "If this email exists, an OTP has been sent." };
};

// ── verify reset OTP → return short-lived reset token ─

const verifyResetOtp = async (payload: { email: string; otp: string }) => {
  const storedOtp = await redis.get(`otp:reset:${payload.email}`);
  if (!storedOtp || storedOtp !== payload.otp) {
    throw new ApiPathError(
      httpStatus.BAD_REQUEST,
      "otp",
      "Invalid or expired OTP.",
    );
  }

  await redis.del(`otp:reset:${payload.email}`);

  // Issue a short-lived, single-use reset token (JWT)
  const resetToken = jwt.sign(
    { email: payload.email, purpose: "password_reset" },
    process.env.JWT_RESET_SECRET!,
    { expiresIn: "10m" },
  );

  // Store token hash in Redis to enforce single-use
  const tokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  await redis.set(`reset_token:${tokenHash}`, payload.email, "EX", 10 * 60);

  return { resetToken };
};

// ── reset password ────────────────────────────────────

const resetPassword = async (payload: {
  resetToken: string;
  newPassword: string;
}) => {
  // Verify token
  let decoded: { email: string; purpose: string };
  try {
    decoded = jwtHelpers.verifyToken(
      payload.resetToken,
      process.env.JWT_RESET_SECRET!,
    ) as any;
  } catch {
    throw new ApiPathError(
      httpStatus.BAD_REQUEST,
      "resetToken",
      "Invalid or expired reset token.",
    );
  }

  if (decoded.purpose !== "password_reset") {
    throw new ApiPathError(
      httpStatus.BAD_REQUEST,
      "resetToken",
      "Invalid token purpose.",
    );
  }

  // Check single-use hash
  const tokenHash = crypto
    .createHash("sha256")
    .update(payload.resetToken)
    .digest("hex");
  const storedEmail = await redis.get(`reset_token:${tokenHash}`);
  if (!storedEmail) {
    throw new ApiPathError(
      httpStatus.BAD_REQUEST,
      "resetToken",
      "Token already used or expired.",
    );
  }

  const hashedPassword = await bcrypt.hash(payload.newPassword, 12);

  await prisma.user.update({
    where: { email: decoded.email },
    data: {
      auth: {
        update: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
        },
      },
    },
  });

  // Invalidate token after use
  await redis.del(`reset_token:${tokenHash}`);

  return { message: "Password reset successfully." };
};

// ── refresh access token ──────────────────────────────

const refreshToken = async (token: string, res: any) => {
  let decoded: { id: string; role: string };
  try {
    decoded = jwtHelpers.verifyToken(token, env.JWT_SECRET!) as any;
  } catch {
    throw new ApiPathError(
      httpStatus.UNAUTHORIZED,
      "refreshToken",
      "Invalid or expired refresh token.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, role: true, status: true, isDeleted: true },
  });

  if (!user || user.isDeleted || user.status === "BLOCKED") {
    throw new ApiPathError(
      httpStatus.UNAUTHORIZED,
      "refreshToken",
      "User no longer active.",
    );
  }

  const tokens = AuthUtils.setTokenCookies(res, user);
  return tokens;
};

// ── logout ────────────────────────────────────────────

const logout = (res: any) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return { message: "Logged out successfully." };
};

export const AuthServices = {
  register,
  verifyOtp,
  login,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  refreshToken,
  logout,
};
