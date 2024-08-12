import { Model, Types } from "mongoose";
import { TFaculty } from "../faculty/faculty.interface";

export type TUser = {
  id: string;
  password: string;
  needChangePassword?: boolean;
  role: "admin" | "faculty";
  userAccess: string[];
  isApproved: boolean;
  isActive: boolean;
  isDeleted: boolean;
};


export interface UserModel extends Model<TUser> {
  isUserExists(userId:string): Promise<TUser | null>;
}
