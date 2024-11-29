import express from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { AuthValidations } from "./auth.validation";
import { AuthControllers } from "./auth.controller";

const router = express.Router();


router.post(
  "/login",
  validateRequest(AuthValidations.loginValidationSchema),
  AuthControllers.login
);
router.patch(
  "/change-password",
  validateRequest(AuthValidations.changePasswordValidationSchema),
  AuthControllers.changePassword
);
router.patch(
  "/send-otp",
  AuthControllers.sendOTP
);
router.patch(
  "/delete-otp",
  AuthControllers.deleteOTP
);
router.post(
  "/matched-otp",validateRequest(AuthValidations.matchedOTPValidation),
  AuthControllers.matchedOTP
);
router.patch(
  "/reset-password",validateRequest(AuthValidations.resetPasswordValidation),
  AuthControllers.resetPassword
);


export const AuthRoutes = router;
