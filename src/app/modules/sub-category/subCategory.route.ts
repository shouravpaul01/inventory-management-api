import express from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { SubCatValidationSchema } from "./subCategory.validation";
import { SubCatControllers } from "./subCategory.controller";
import { USER_ROLE } from "../user/user.constent";
import auth from "../../middlewares/auth";



const router = express.Router();

router.post(
  "/create-sub-category",
  validateRequest(SubCatValidationSchema),
  SubCatControllers.createSubCategoryInto
);
router.get('/',SubCatControllers.getAllSubCategories)
router.get('/single-sub-category/:subCategoryId',SubCatControllers.getSingleSubCategory)
router.patch('/update-sub-category/:subCategoryId',validateRequest(SubCatValidationSchema),SubCatControllers.updateSubCategoryInto)
router.patch('/update-active-status/:subCategoryId',SubCatControllers.updateSubCategoryStatus)
router.patch('/update-approved-status/:subCategoryId',auth(USER_ROLE.Admin),SubCatControllers.updateSubCategoryApprovedStatus)
router.get('/all-active-sub-categories/:categoryId',SubCatControllers.getAllActiveSubCategoriesByCategory)

export const SubCatRoutes=router