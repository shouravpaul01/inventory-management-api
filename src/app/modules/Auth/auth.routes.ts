import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidations } from "./auth.validation";

const router = express.Router();

router.post(
  "/login",
  validateRequest(AuthValidations.login),
  AuthController.login
);

router.get("/me", auth(), AuthController.getMe);

router.post("/refresh-token", AuthController.refreshToken);

router.post(
  "/change-password",
  auth(),
  AuthController.changePassword
);

router.post(
  "/forgot-password",
  validateRequest(AuthValidations.forgotPassword),
  AuthController.forgotPassword
);

router.post(
  "/verify-reset-otp",
  validateRequest(AuthValidations.verifyResetOtp),
  AuthController.verifyResetOtp
);

router.post(
  "/reset-password",
  validateRequest(AuthValidations.resetPassword),
  AuthController.resetPassword
);

router.post("/logout", AuthController.logout);

export const AuthRoutes = router;
