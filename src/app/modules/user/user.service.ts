import mongoose from "mongoose";
import { TFaculty } from "../faculty/faculty.interface";
import { Faculty } from "../faculty/faculty.model";
import { TUser } from "./user.interface";
import { User } from "./user.model";
import { generateFacultyId } from "./user.utils";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import { QueryBuilder } from "../../builder/QueryBuilder";
import { match } from "assert";

const createfacultyDB = async (payload: TFaculty) => {
  const userData: Partial<TUser> = {};

  payload.userId = await generateFacultyId();
  userData.email = payload.email;

  userData.password = payload.email;

  const session = await mongoose.startSession();

  try {
    await session.startTransaction();
    const isFacultyCreated = await Faculty.create([payload], { session });

    if (!isFacultyCreated.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "facultyError",
        "The faculty member could not be created. Please try again."
      );
    }

    userData.faculty = isFacultyCreated[0]._id;
    userData.userId = isFacultyCreated[0].userId;
    const isUserCreated = await User.create([userData], { session });

    if (!isUserCreated.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "facultyError",
        "The faculty member could not be created. Please try again."
      );
    }

    await session.commitTransaction();
    await session.endSession();
    return isFacultyCreated[0];
  } catch (error) {
 
    await session.abortTransaction();
    await session.endSession();
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "facultyError",
      "The faculty member could not be created. Please try again."
    );
  }
};
const getAllUsersDB = async (query: Record<string, undefined>) => {
  const searchableFields = ["name", "email", "userId", "designation"];

  const mainQuery = new QueryBuilder(User.find({}).populate("faculty"), query)
    .filter()
    .search(searchableFields);

  const totalPages = (await mainQuery.totalPages()).totalQuery;
  const queryPaginated = mainQuery.paginate();
  const facultyMembers = await queryPaginated.modelQuery;

  const result = { data: facultyMembers, totalPages: totalPages };
  return result;
};
const getSingleUserDB = async (userIdOrEmail: string) => {
  const result = await User.findOne({  $or: [{ userId: userIdOrEmail }, { email: userIdOrEmail }], }).populate("faculty");
  console.log(result,userIdOrEmail,"dddd")
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "userError", "Faculty member does not exist.");
  }
  return result;
};
const updateUserDB = async (userId: string, payload: Partial<TFaculty>) => {
  if (!(await User.isUserExists(userId))) {
    throw new AppError(httpStatus.NOT_FOUND, "userError", "Faculty member does not exist.");
  }
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();
    const isFacultyCreated = await Faculty.findOneAndUpdate(
      { userId },
      payload,
      { session, new: true }
    );

    if (!isFacultyCreated) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "userError",
        "Update failed. Please try again."
      );
    }

    const isUserCreated = await User.findOneAndUpdate(
      { userId },
      { email: payload.email },
      { session, new: true }
    );

    if (!isUserCreated) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "userError",
        "Update failed. Please try again."
      );
    }

    await session.commitTransaction();
    await session.endSession();
    return isFacultyCreated;
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "userError",
      "The faculty member could not be created. Please try againrr."
    );
  }
};
const updateUserRoleDB = async (userId: string, role: string) => {
  if (!(await User.isUserExists(userId))) {
    throw new AppError(httpStatus.NOT_FOUND, "roleError", "Faculty member does not exist.");
  }
  const result = await User.findOneAndUpdate(
    { userId },
    { role },
    { new: true }
  );
  return result;
};
const updateUserBlockedStatusDB = async (userId: string, isBlocked: string) => {
  if (!(await User.isUserExists(userId))) {
    throw new AppError(httpStatus.NOT_FOUND, "isBlocked", "Faculty member does not exist.");
  }
  const result = await User.findOneAndUpdate(
    { userId },
    { isBlocked },
    { new: true }
  );
  return result;
};
const deleteUserDB = async (userId: string) => {
  if (!(await User.isUserExists(userId))) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "isDeletedError",
      "User Not Found."
    );
  }
  const result = await User.findOneAndUpdate(
    { userId },
    { isDeleted: true },
    { new: true }
  );
  return result;
};
const restoreUserDB = async (userId: string) => {
  if (!(await User.isUserExists(userId))) {
    throw new AppError(httpStatus.NOT_FOUND, "restoreError", "Faculty member does not exist.");
  }
  const result = await User.findOneAndUpdate(
    { userId },
    { isDeleted: false },
    { new: true }
  );
  return result;
};
export const UserServices = {
  createfacultyDB,
  getAllUsersDB,
  getSingleUserDB,
  updateUserDB,
  updateUserRoleDB,
  updateUserBlockedStatusDB,
  deleteUserDB,
  restoreUserDB,
};
