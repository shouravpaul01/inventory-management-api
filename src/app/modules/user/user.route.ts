import express from 'express'
import { validateRequest } from '../../middlewares/validateRequest'
import { FacultyValidations } from '../faculty/faculty.validation'
import { UserControllers } from './user.controller'
import {UserValidations} from '../user/user.validation'
const router=express.Router()

router.post("/create-faculty",validateRequest(FacultyValidations.createFacultySchemaValidation),UserControllers.createFaculty)
router.post("/update-approved-status/:userId",validateRequest(UserValidations.updateApprovedStatusValidation),UserControllers.updateUserApprovedStatus)
router.post("/update-active-status/:userId",validateRequest(UserValidations.updateActiveStatusValidation),UserControllers.updateUserActiveStatus)
export const UserRoutes=router