import express from 'express'
import { validateRequest } from '../../middlewares/validateRequest'
import { FacultyValidations } from '../faculty/faculty.validation'
import { UserControllers } from './user.controller'
import {UserValidations} from '../user/user.validation'
const router=express.Router()

router.post("/create-faculty",validateRequest(FacultyValidations.createFacultySchemaValidation),UserControllers.createFaculty)
router.get("/",UserControllers.getAllUsers)
router.get("/single-user/:userIdOrEmail",UserControllers.getSingleUser)
router.patch("/update-role/:userId",UserControllers.updateUserRole)
router.patch("/update-user/:userId",UserControllers.updateUser)
router.patch("/update-blocked-status/:userId",UserControllers.updateUserBlockedStatus)
router.delete("/delete-user/:userId",UserControllers.deleteUser)
router.patch("/restore-user/:userId",UserControllers.restoreUser)
export const UserRoutes=router