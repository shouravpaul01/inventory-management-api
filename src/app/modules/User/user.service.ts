import httpStatus from "http-status";
import prisma from "../../../shared/prisma";

import ApiError from "../../../errors/ApiErrors";
import { uploadFileToS3 } from "../../../helpers/uploadToS3";
import { UserRole, UserStatus } from "@prisma/client";

// ── get my profile ────────────────────────────────────

const getMe = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
  }

  return user;
};

// ── update my profile ─────────────────────────────────

const updateMe = async (
  userId: string,
  file: Express.Multer.File | undefined,
  payload: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    bio?: string;
  },
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      email: true,
      phone: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
  }

  // ── photo upload ──────────────────────────────────
  let photoUrl: string | undefined;
  if (file) {
    const { fileUrl } = await uploadFileToS3(file);
    photoUrl = fileUrl;
  }

  const firstName = payload.firstName ?? user?.firstName;
  const lastName = payload.lastName ?? user.lastName;
  const fullName = `${firstName} ${lastName}`;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...payload,
      fullName,
      ...(photoUrl && { photo: photoUrl }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      email: true,
      phone: true,
      photo: true,
      bio: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updated;
};
// ── delete my account ─────────────────────────────────

const deleteMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
  }

  // soft delete
  await prisma.user.update({
    where: { id: userId },
    data: {
      isDeleted: true,
      status: "BLOCKED",
      fcmToken: null,
    },
  });

  return { message: "Account deleted successfully." };
};

// ── [ADMIN] get all users ─────────────────────────────
const getAllUsers = async (params: {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}) => {
  const page = params.page || 1;
  const limit = params.limit || 10;
  const skip = (page - 1) * limit;

  const where: any = {
    isDeleted: false,
    ...(params.role && { role: params.role }),
    ...(params.status && { status: params.status }),
    ...(params.search && {
      OR: [
        { firstName: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        fullName: true,
        email: true,
        phone: true,
        photo: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ── [ADMIN] get user by id ────────────────────────────
const getUserById = async (targetId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: targetId, isDeleted: false },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
  }

  return user;
};

// ── [ADMIN] update user status ────────────────────────
const updateUserStatus = async (
  targetId: string,
  status: UserStatus,
) => {
  const user = await prisma.user.findUnique({
    where: { id: targetId, isDeleted: false },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { status },
    select: {
      id: true,
      fullName: true,
      email: true,
      status: true,
    },
  });

  return updated;
};


export const UserServices = {
  getMe,
  updateMe,
  deleteMe,
  
  getAllUsers,
  getUserById,
  updateUserStatus,
}