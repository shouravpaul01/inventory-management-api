import bcrypt from "bcrypt";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";

/**
 * Hashes a plaintext password using bcrypt.
 */
export const hashPassword = async (password: string, saltRounds = 12): Promise<string> => {
  return bcrypt.hash(password, saltRounds);
};

/**
 * Validates whether an existing user conflicts with a candidate user's fields.
 */
export const validateUniqueUserFields = (
  existingUser: { employeeId: string; username: string; email: string },
  candidate: { employeeId: string; username: string; email: string }
): void => {
  if (existingUser.employeeId === candidate.employeeId) {
    throw new ApiError(httpStatus.CONFLICT, `Employee ID '${candidate.employeeId}' is already registered!`);
  }
  if (existingUser.username === candidate.username) {
    throw new ApiError(httpStatus.CONFLICT, `Username '${candidate.username}' is already taken!`);
  }
  if (existingUser.email === candidate.email) {
    throw new ApiError(httpStatus.CONFLICT, `Email '${candidate.email}' is already in use!`);
  }
};

export const UserUtils = {
  hashPassword,
  validateUniqueUserFields,
};
