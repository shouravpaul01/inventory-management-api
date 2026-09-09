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

router.post("/logout", AuthController.logout);

export const AuthRoutes = router;
