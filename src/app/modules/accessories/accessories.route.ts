import express from 'express'
import { AccessoryControllers } from './accessories.controller'
import { upload } from '../../config/multer.config'
import parseData from '../../middlewares/parseData'
import { validateRequest } from '../../middlewares/validateRequest'
import { accessoryValidation } from './accessories.validation'
const router=express.Router()

router.post("/create-accessory",upload.single("file"),parseData,validateRequest(accessoryValidation), AccessoryControllers.createAccessoryInto)
export const AccessoryRouters=router