import express from 'express'
import { validateRequest } from '../../middlewares/validateRequest'
import { FacultyValidations } from '../faculty/faculty.validation'
import { FacultyControllers } from './faculty.controller'
const router=express.Router()

router.get("/",FacultyControllers.getAllFacultyMembers)

export const FacultyRoutes=router