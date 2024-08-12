import mongoose from "mongoose";
import { TFaculty } from "../faculty/faculty.interface";
import { Faculty } from "../faculty/faculty.model";
import { TUser } from "./user.interface";
import { User } from "./user.model";
import { generateFacultyId } from "./user.utils";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import { QueryBuilder } from "../../builder/QueryBuilder";

const createfacultyDB = async (payload: TFaculty) => {
  const userData: Partial<TUser> = {};
  userData.id = await generateFacultyId();
  payload.id = await generateFacultyId();
  userData.password = payload.email.split("@")[0];
  userData.role = "faculty";
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();
    const isUserCreated = await User.create([userData], { session });
    if (!isUserCreated.length) {
      throw new AppError(httpStatus.BAD_REQUEST, "", "Failed to create User.");
    }
    payload.user = isUserCreated[0]._id;
    const isFacultyCreated = await Faculty.create([payload], { session });
    if (!isFacultyCreated.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "",
        "Failed to create Faculty."
      );
    }

    await session.commitTransaction();
    await session.endSession();
    return isFacultyCreated[0];
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    throw new AppError(httpStatus.BAD_REQUEST, "", "Failed to create Faculty.");
  }
};

const updateUserApprovedStatusDB = async (
  userId: string,
  payload: Partial<TUser>
) => {
  if (!(await User.isUserExists(userId))) {
    throw new AppError(httpStatus.NOT_FOUND, "isApproved", "User Not Found.");
  }
  const result = await User.findByIdAndUpdate(userId, payload, { new: true });
  return result;
};
const updateUserActiveStatusDB = async (
  userId: string,
  payload: Partial<TUser>
) => {
  if (!(await User.isUserExists(userId))) {
    throw new AppError(httpStatus.NOT_FOUND, "isActive", "User Not Found.");
  }
  const result = await User.findByIdAndUpdate(userId, payload, { new: true });
  return result;
};
export const UserServices = {
  createfacultyDB,
  updateUserApprovedStatusDB,
  updateUserActiveStatusDB
};
