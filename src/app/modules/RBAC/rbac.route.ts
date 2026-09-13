import express from "express";
import auth from "../../middlewares/auth";
import checkPermission from "../../middlewares/checkPermission";
import validateRequest from "../../middlewares/validateRequest";
import { RbacController } from "./rbac.controller";
import { RbacValidation } from "./rbac.validation";

const router = express.Router();

// Permissions
router.get(
  "/permissions",
  auth(),
  checkPermission("role.view"),
  RbacController.getAllPermissions
);

// Roles
router.get(
  "/roles",
  auth(),
  checkPermission("role.view"),
  RbacController.getAllRoles
);

router.get(
  "/roles/:id",
  auth(),
  checkPermission("role.view"),
  RbacController.getRoleById
);

router.post(
  "/roles",
  auth(),
  checkPermission("role.create"),
  validateRequest(RbacValidation.createRoleZodSchema),
  RbacController.createRole
);

router.patch(
  "/roles/:id",
  auth(),
  checkPermission("role.update"),
  validateRequest(RbacValidation.updateRoleZodSchema),
  RbacController.updateRole
);

router.delete(
  "/roles/:id",
  auth(),
  checkPermission("role.delete"),
  RbacController.deleteRole
);

router.post(
  "/roles/:id/permissions",
  auth(),
  checkPermission("role.update"),
  validateRequest(RbacValidation.assignRolePermissionsZodSchema),
  RbacController.assignRolePermissions
);

export const RbacRoutes = router;
