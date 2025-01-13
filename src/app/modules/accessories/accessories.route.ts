import express from 'express'
import { AccessoryControllers } from './accessories.controller'
import { upload } from '../../config/multer.config'
import parseData from '../../middlewares/parseData'
import { validateRequest } from '../../middlewares/validateRequest'
import { accessoryValidation } from './accessories.validation'
import auth from '../../middlewares/auth'
import { USER_ROLE } from '../user/user.constent'
const router=express.Router()

router.post("/create-accessory",upload.single("file"),parseData,validateRequest(accessoryValidation), AccessoryControllers.createAccessoryInto)
router.get("/",AccessoryControllers.getAllAccessories)
router.get('/single-accessory/:accessoryId',AccessoryControllers.getSingleAccessory)
router.patch('/update-accessory/:accessoryId',upload.single("file"),parseData,AccessoryControllers.updateAccessory)
router.patch('/update-active-status/:accessoryId',AccessoryControllers.updateAccessoryStatus)
router.patch('/update-approved-status/:accessoryId',auth(USER_ROLE.Admin),AccessoryControllers.updateAccessoryApprovedStatus)
export const AccessoryRouters=router