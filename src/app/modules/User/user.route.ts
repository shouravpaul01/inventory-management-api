import express from "express";
import auth from "../../middlewares/auth";
import checkPermission from "../../middlewares/checkPermission";
import validateRequest from "../../middlewares/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = express.Router();

router.post(
  "/",
  auth(),
  checkPermission("user.create"),
  validateRequest(UserValidation.createUserZodSchema),
  UserController.createUser
);

router.get(
  "/",
  auth(),
  checkPermission("user.view"),
  UserController.getAllUsers
);

router.get(
  "/:id",
  auth(),
  checkPermission("user.view"),
  UserController.getUserById
);

router.patch(
  "/:id",
  auth(),
  checkPermission("user.update"),
  validateRequest(UserValidation.updateUserZodSchema),
  UserController.updateUser
);

router.patch(
  "/:id/status",
  auth(),
  checkPermission("user.status"),
  validateRequest(UserValidation.updateUserStatusZodSchema),
  UserController.updateUserStatus
);

router.post(
  "/:id/roles",
  auth(),
  checkPermission("user.manage_roles"),
  validateRequest(UserValidation.assignUserRolesZodSchema),
  UserController.assignUserRoles
);

router.post(
  "/:id/permissions",
  auth(),
  checkPermission("user.override_permission"),
  validateRequest(UserValidation.overrideUserPermissionsZodSchema),
  UserController.overrideUserPermissions
);

export const UserRoutes = router;
