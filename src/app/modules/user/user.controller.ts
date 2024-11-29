import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { UserServices } from "./user.service";

const createFaculty = catchAsync(async (req, res) => {
  
  const result = await UserServices.createfacultyDB(req.body);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "The faculty member has been successfully created.",
    data: result,
  });
});
const getAllUsers = catchAsync(async (req, res) => {
  const result = await UserServices.getAllUsersDB(
    req.query as Record<string, undefined>
  );
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully fetched all faculty members.",
    data: result,
  });
});
const getSingleUser = catchAsync(async (req, res) => {
    const { userIdOrEmail } = req.params;
    const result = await UserServices.getSingleUserDB(userIdOrEmail);
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Successfully fetched a faculty member.",
      data: result,
    });
  });
  const updateUser = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const result = await UserServices.updateUserDB(userId,req.body);
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Successfully updated",
      data: result,
    });
  });
const updateUserRole = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.query;
  const result = await UserServices.updateUserRoleDB(userId, role as string);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Role updated successfully.",
    data: result,
  });
});
const updateUserBlockedStatus = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { isBlocked } = req.query;
  const result = await UserServices.updateUserBlockedStatusDB(
    userId,
    isBlocked as string
  );
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${
      result?.isBlocked ? "Succesfully Unblocked" : "Successfully Blocked."
    }`,
    data: result,
  });
});
const deleteUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const result = await UserServices.deleteUserDB(userId);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "The user account was successfully deleted.",
    data: result,
  });
});
const restoreUser = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const result = await UserServices.restoreUserDB(userId);
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User account restored successfully.",
      data: result,
    });
  });
export const UserControllers = {
  createFaculty,
  getAllUsers,
  getSingleUser,
  updateUser,
  updateUserRole,
  updateUserBlockedStatus,
  deleteUser,
  restoreUser
};
