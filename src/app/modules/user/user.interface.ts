import { Types, Model } from "mongoose";
import { TFaculty } from "../faculty/faculty.interface";
import { USER_ROLE } from "./user.constent";

export type TEventHistory = {
  eventType: "created" | "updated" | "approved" | "blocked" | "unblocked" | "passwordChanged" | "pending";
  performedBy?: Types.ObjectId | string;
  performedAt: Date;
  comments?: string;
};



export type TUser = {
  _id:Types.ObjectId;
  userId: string;
  faculty: Types.ObjectId | TFaculty;
  email: string;
  password: string;
  otp?: number;
  needChangePassword?: boolean;
  role?: "Admin" | "Faculty";
  userAccess?: string[];
  isBlocked?: boolean;
  isApproved:boolean;
  isDeleted?: boolean;
  
  eventshistory?: TEventHistory[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type TUserRole = keyof typeof USER_ROLE;

export interface UserModel extends Model<TUser> {
  isUserExists(userId: string): Promise<TUser | null>;
}