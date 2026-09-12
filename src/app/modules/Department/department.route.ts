import express from "express";
import auth from "../../middlewares/auth";
import checkPermission from "../../middlewares/checkPermission";
import validateRequest from "../../middlewares/validateRequest";
import { DepartmentController } from "./department.controller";
import { DepartmentValidation } from "./department.validation";

const router = express.Router();

router.post(
  "/",
  auth(),
  checkPermission("department.create"),
  validateRequest(DepartmentValidation.createDepartmentZodSchema),
  DepartmentController.createDepartment
);

router.get(
  "/",
  auth(),
  checkPermission("department.view"),
  DepartmentController.getAllDepartments
);

router.get(
  "/:id",
  auth(),
  checkPermission("department.view"),
  DepartmentController.getDepartmentById
);

router.patch(
  "/:id",
  auth(),
  checkPermission("department.update"),
  validateRequest(DepartmentValidation.updateDepartmentZodSchema),
  DepartmentController.updateDepartment
);

router.delete(
  "/:id",
  auth(),
  checkPermission("department.delete"),
  DepartmentController.deleteDepartment
);

export const DepartmentRoutes = router;
