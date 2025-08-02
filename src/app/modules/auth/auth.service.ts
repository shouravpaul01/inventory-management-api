import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { User } from "../user/user.model";
import { TChangePassword, TLogin, TMatchedOTP, TResetPassword } from "./auth.interface";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../../config";
import { TFaculty } from "../faculty/faculty.interface";
import generateOTP from "../../utils/generateOTP";
import { sendMail } from "../../utils/sendMail";
import { generateOTPEamilTemplate } from "../../utils/generateOTPEamilTemplate";
import verifyToken from "../../utils/verifyToken";

const loginDB = async (payload: TLogin) => {
  console.log(payload, "auth");
  const isUserExists = await User.findOne({ userId: payload?.userId })
    .populate("faculty")
    .select("+password");

  if (!isUserExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "authError",
      "Incorrect user or password!."
    );
  }
  if (isUserExists?.isBlocked) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "authError",
      "Your account has been blocked. Please contact support."
    );
  }
  const isMatchedPassword = await bcrypt.compare(
    payload?.password,
    isUserExists?.password
  );

  if (!isMatchedPassword) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "authError",
      "Incorrect user or password!."
    );
  }
  const jwtPayload = {
    _id: isUserExists._id,
    faculty:(isUserExists.faculty as TFaculty)._id,
    name: (isUserExists.faculty as TFaculty).name,
    profileImage: (isUserExists.faculty as TFaculty).image || null,
    userId: isUserExists.userId,
    email: isUserExists.email,
    role: isUserExists.role,
    userAccess: isUserExists.userAccess,
  };

  const accessToken = jwt.sign(jwtPayload, config.jwt_secret as string, {
    expiresIn: config.jwt_expries,
  });
  const user = isUserExists.toObject();
  delete (user as { password?: string }).password;
  return { accessToken };
};
const changePasswordDB = async (payload: TChangePassword) => {
  const isUserExists = await User.findOne({ email: payload.email }).select(
    "+password"
  );
  if (!isUserExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "authError",
      "Faculty member does not exist."
    );
  }
  const isMatchedPassword = await bcrypt.compare(
    payload?.oldPassword,
    isUserExists?.password
  );
  if (!isMatchedPassword) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "oldPassword",
      "Old password is incorrect."
    );
  }
  const passwordBycrpt = await bcrypt.hash(
    payload.password,
    Number(config.bcrypt_salt_rounds)
  );
  const result = await User.findOneAndUpdate(
    { email: payload.email },
    { password: passwordBycrpt },
    { new: true }
  );
  return result;
};

const sendOTPDB = async (email: string) => {
  const isUserExists = await User.findOne({ email: email }).populate("faculty");
  if (!isUserExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "authError",
      "Faculty member does not exist."
    );
  }
  const result = await User.findOneAndUpdate(
    { email: email },
    { otp: generateOTP() },
    { new: true }
  ).select("+otp");
  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "authError",
      "Faculty member does not exist."
    );
  }

  const sendMailArg = {
    to: result?.email,
    subject: "Your OTP Verification Code",
    html: generateOTPEamilTemplate(
      result?.otp,
      (result?.faculty as TFaculty).name
    ),
  };
  sendMail(sendMailArg);
  const verificationToken = jwt.sign(
    { email: result.email },
    config.jwt_secret as string,
    {
      expiresIn: 240,
    }
  );
  return { verificationToken: verificationToken };
};
const deleteOTPDB = async (email: string) => {
  const result = await User.findOneAndUpdate(
    { email },
    { $unset: { otp: "" } },
    { new: true }
  );

  return result;
};
const matchedOTPDB = async (payload: TMatchedOTP) => {

  const isVerfiedToken = verifyToken(
    payload.token,
    "The OTP has expired. Please try again."
  );

  const isUserExists = await User.findOne({
    email: isVerfiedToken.email,
    otp: payload.otp,
  }).select("+otp");

  if (!isUserExists) {
    console.log("dd");
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "otpError",
      "Invalid OTP. Please try again."
    );
  }
  const resetPasswordToken = jwt.sign(
    { email: isUserExists.email, otp: isUserExists.otp },
    config.jwt_secret as string,
    {
      expiresIn: 600,
    }
  );
  return { resetPasswordToken: resetPasswordToken };
};
const resetPasswordDB = async (payload: TResetPassword) => {
  const isVerfiedToken = verifyToken(
    payload.token,
    "Timeout!.Password reset process not completed. Please try again."
  );
  const isUserExists = await User.findOne({
    email: isVerfiedToken.email,
    otp: isVerfiedToken.otp,
  }).select("+otp");

  if (!isUserExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "authError",
      "Invalid OTP. Please try again."
    );
  }
  const passwordBycrpt = await bcrypt.hash(
    payload.password!,
    Number(config.bcrypt_salt_rounds)
  );
  const result = await User.updateOne(
    { email: isUserExists.email },
    { $set: { password: passwordBycrpt }, $unset: { otp: "" } },
    { new: true }
  );

  return result;
};
export const AuthServices = {
  loginDB,
  changePasswordDB,
  sendOTPDB,
  deleteOTPDB,
  matchedOTPDB,
  resetPasswordDB,
};
