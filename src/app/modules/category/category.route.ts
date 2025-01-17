import express from "express";
import { validateRequest } from "../../middlewares/validateRequest";

import { CategoryControllers } from "./category.controller";
import { categoryValidationSchema } from "./category.validation";
import { USER_ROLE } from "../user/user.constent";
import auth from "../../middlewares/auth";


const router = express.Router();

router.post(
  "/create-category",
  validateRequest(categoryValidationSchema),
  CategoryControllers.createCategoryInto
);
router.get('/',CategoryControllers.getAllCategories)
router.get('/single-category/:categoryId',CategoryControllers.getSingleCategory)
router.patch('/update-category/:categoryId',validateRequest(categoryValidationSchema),CategoryControllers.updateCategoryInto)
router.patch('/update-active-status/:categoryId',CategoryControllers.updateCategoryStatus)
router.patch('/update-approved-status/:categoryId',auth(USER_ROLE.Admin),CategoryControllers.updateCategoryApprovedStatus)

export const CategoryRoutes=router