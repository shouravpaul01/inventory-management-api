import mongoose, { Types } from "mongoose";
import { TFaculty } from "../faculty/faculty.interface";
import { Faculty } from "../faculty/faculty.model";
import { TUser } from "./user.interface";
import { User } from "./user.model";
import { generateFacultyId } from "./user.utils";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import { QueryBuilder } from "../../builder/QueryBuilder";
import { JwtPayload } from "jsonwebtoken";
const logEvent = (
  type: "created" | "updated" |  "approved" | "blocked" | "unblocked"  ,
  performedBy?: Types.ObjectId,
  comments?: string
) => ({
  eventType: type,
  performedBy,
  performedAt: new Date(),
  comments,
});
const createfacultyDB = async (payload: TFaculty,user: JwtPayload,) => {
  const userData: Partial<TUser> = {
  };

  payload.userId = await generateFacultyId();
  userData.email = payload.email;

  userData.password = payload.email;
  userData.eventshistory=[logEvent("created",user.faculty,"User Created")]
  payload.eventshistory=[logEvent("created",user.faculty,"Faculty Created")]

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

const updateUserApprovedStatusDB = async (
  user: JwtPayload,
  userId: string
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const isUserExists = await User.findOne({ userId }).session(session);
    if (!isUserExists) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "userError",
        "User does not exist."
      );
    }

    const approvalData = {
      "approvalDetails.isApproved": true,
      "approvalDetails.approvedBy": user._id,
      "approvalDetails.approvedDate": new Date(),
      isBlocked: false,
    };

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      approvalData,
      { new: true, session }
    );

    await Faculty.findOneAndUpdate(
      { userId },
      approvalData,
      { new: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    return updatedUser;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(httpStatus.NOT_FOUND,"userError", "User does not exist.");
  }
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
   await Faculty.findOneAndUpdate(
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
  updateUserApprovedStatusDB,
  updateUserBlockedStatusDB,
  deleteUserDB,
  restoreUserDB,
};
