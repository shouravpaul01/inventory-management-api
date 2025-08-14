import express from 'express'
import { AccessoryControllers } from './accessories.controller'
import { upload, uploadSingleImage } from '../../config/multer.config'
import parseData from '../../middlewares/parseData'
import { validateRequest } from '../../middlewares/validateRequest'
import { accessoryValidation } from './accessories.validation'
import auth from '../../middlewares/auth'
import { USER_ROLE } from '../user/user.constent'
const router=express.Router()

router.post("/create-accessory",auth(USER_ROLE.Admin),uploadSingleImage("file"),parseData,validateRequest(accessoryValidation), AccessoryControllers.createAccessoryInto)
router.get("/",AccessoryControllers.getAllAccessories)
router.get('/single-accessory/:accessoryId',AccessoryControllers.getSingleAccessory)
router.patch('/update-accessory/:accessoryId',auth(USER_ROLE.Admin),uploadSingleImage("file"),parseData,AccessoryControllers.updateAccessory)
router.patch('/update-active-status/:accessoryId',auth(USER_ROLE.Admin),AccessoryControllers.updateAccessoryStatus)
router.patch('/update-approved-status/:accessoryId',auth(USER_ROLE.Admin),AccessoryControllers.updateAccessoryApprovedStatus)
router.delete('/delete-image/:accessoryId',AccessoryControllers.deleteSingleImage)
export const AccessoryRouters=router