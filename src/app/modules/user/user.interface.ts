import { Model, Types } from "mongoose";
import { TFaculty } from "../faculty/faculty.interface";
import { USER_ROLE } from "./user.constent";

export type TUser = {
  userId: string;
  faculty: Types.ObjectId | TFaculty;
  email: string;
  password: string;
  otp: number;
  needChangePassword?: boolean;
  role: "Admin" | "Faculty";
  userAccess: string[];
  isApproved: boolean;
  isBlocked: boolean;
  isDeleted: boolean;
};
export type TUserRole = keyof typeof USER_ROLE;

export interface UserModel extends Model<TUser> {
  isUserExists(userId: string): Promise<TUser | null>;
}
