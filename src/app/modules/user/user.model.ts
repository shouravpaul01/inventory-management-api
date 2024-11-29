import  { Schema, model } from "mongoose";
import { TUser, UserModel } from "./user.interface";
import bcrypt from "bcrypt";
import config from "../../config";
import { number } from "zod";

const userSchema = new Schema<TUser,UserModel>(
  {
    userId: { type: String, required: true, unique: true },
    faculty:{type:Schema.Types.ObjectId,ref:"Faculty",required:true},
    email:{type: String, required: true},
    password: { type: String, required: true, select: false },
    otp: { type: Number,select:false },
    needChangePassword: { type: Boolean, default: true },
    role: {
      type: String,
      enum: ["Admin", "Faculty"],
      default: "Faculty",
    },

    userAccess: {
      type: [String],
    },
    isApproved: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  this.password = await bcrypt.hash(this.password, Number(config.bcrypt_salt_rounds));
  next();
});
userSchema.statics.isUserExists=async function(userId:string) {
  return await User.findOne({userId})
}

export const User = model<TUser,UserModel>("User", userSchema);
