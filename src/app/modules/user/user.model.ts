import  { Schema, Types, model } from "mongoose";
import { TUser, UserModel } from "./user.interface";
import bcrypt from "bcrypt";
import config from "../../config";
const eventHistorySchema = new Schema({
  eventType: {
    type: String,
    enum: ["created","updated", "approved","blocked","unblocked","passwordChanged"],
    default: "pending",
  },
  
  performedBy: {
    type: Types.ObjectId,
    ref: "User",
  },
  performedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  comments: {
    type: String,
  },
  
});
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
    
    isBlocked: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    eventshistory:[eventHistorySchema],
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
