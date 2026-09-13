import express from "express";
import auth from "../../middlewares/auth";
import checkPermission from "../../middlewares/checkPermission";
import validateRequest from "../../middlewares/validateRequest";
import { CategoryController } from "./category.controller";
import { CategoryValidation } from "./category.validation";

const router = express.Router();

router.post(
  "/",
  auth(),
  checkPermission("category.create"),
  validateRequest(CategoryValidation.createCategoryZodSchema),
  CategoryController.createCategory
);

router.get(
  "/",
  auth(),
  checkPermission("category.view"),
  CategoryController.getAllCategories
);

router.get(
  "/tree",
  auth(),
  checkPermission("category.view"),
  CategoryController.getCategoryTree
);

router.get(
  "/:id",
  auth(),
  checkPermission("category.view"),
  CategoryController.getCategoryById
);

router.patch(
  "/:id",
  auth(),
  checkPermission("category.update"),
  validateRequest(CategoryValidation.updateCategoryZodSchema),
  CategoryController.updateCategory
);

router.delete(
  "/:id",
  auth(),
  checkPermission("category.delete"),
  CategoryController.deleteCategory
);

export const CategoryRoutes = router;
