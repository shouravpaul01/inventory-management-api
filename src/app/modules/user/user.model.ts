import mongoose, { Schema, Document, model } from "mongoose";
import { TUser, UserModel } from "./user.interface";
import bcrypt from "bcrypt";
import config from "../../config";

const userSchema = new Schema<TUser,UserModel>(
  {
    id: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    needChangePassword: { type: Boolean, default: true },
    role: {
      type: String,
      enum: ["admin", "faculty"],
      default: "faculty",
    },

    userAccess: {
      type: [String],
    },
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  this.password = await bcrypt.hash(this.password, Number(config.saltRounds));
  next();
});
userSchema.statics.isUserExists=async function(userId:string) {
  return await User.findById(userId)
}

export const User = model<TUser,UserModel>("User", userSchema);
