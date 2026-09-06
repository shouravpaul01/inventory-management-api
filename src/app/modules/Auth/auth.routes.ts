import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { AuthValidations } from "./auth.validation";
import { AuthControllers } from "./auth.controller";
import {
  authTokenLimiter,
  otpTokenLimiter,
} from "../../middlewares/tokenBucketLimiter";

const router = Router();

// ─── Registration & Email Verification ───────────────────────────────────────
// authLimiter: prevents bulk account creation / registration spam
router.post(
  "/register",
  authTokenLimiter,
  validateRequest(AuthValidations.register),
  AuthControllers.register,
);

// otpLimiter: prevents OTP enumeration — 3 attempts per 10 min
router.post(
  "/verify-otp",
  otpTokenLimiter,
  validateRequest(AuthValidations.verifyOtp),
  AuthControllers.verifyOtp,
);

// ─── Login / Logout ───────────────────────────────────────────────────────────
// authLimiter: prevents brute-force password attacks — 5 failed attempts per 15 min
router.post(
  "/login",
  authTokenLimiter,
  validateRequest(AuthValidations.login),
  AuthControllers.login,
);

// Logout is safe — no rate limiting needed
router.post("/logout", AuthControllers.logout);

// ─── Token Refresh ────────────────────────────────────────────────────────────
// No strict limit needed — tokens are short-lived and refresh is passive
router.post(
  "/refresh-token",
  validateRequest(AuthValidations.refreshToken),
  AuthControllers.refreshToken,
);

// ─── Password Reset Flow ──────────────────────────────────────────────────────
// authLimiter: prevents email spam / account enumeration via forgot-password
router.post(
  "/forgot-password",
  authTokenLimiter,
  validateRequest(AuthValidations.forgotPassword),
  AuthControllers.forgotPassword,
);

// otpLimiter: prevents reset OTP brute-force — 3 attempts per 10 min
router.post(
  "/verify-reset-otp",
  otpTokenLimiter,
  validateRequest(AuthValidations.verifyResetOtp),
  AuthControllers.verifyResetOtp,
);

// authLimiter: limits how many times someone can submit a new password
router.post(
  "/reset-password",
  authTokenLimiter,
  validateRequest(AuthValidations.resetPassword),
  AuthControllers.resetPassword,
);

export const AuthRoutes = router;
