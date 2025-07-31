import express from "express";
import { validateRequest } from "../../middlewares/validateRequest";

import { USER_ROLE } from "../user/user.constent";
import auth from "../../middlewares/auth";
import { RoomControllers } from "./room.controller";
import { upload } from "../../config/multer.config";
import parseData from "../../middlewares/parseData";

const router = express.Router();

router.post(
  "/create-room",
  auth(USER_ROLE.Admin,USER_ROLE.Faculty),
  upload.array("images", 3),
  parseData,
  RoomControllers.createRoomInto
);
router.get('/',RoomControllers.getAllRooms)
router.get('/single-room/:roomId',RoomControllers.getSingleRoom)
router.patch('/update-room/:roomId',RoomControllers.updateRoomInto)
router.patch('/update-active-status/:roomId',RoomControllers.updateRoomStatus)
router.patch('/update-approved-status/:roomId',auth(USER_ROLE.Admin),RoomControllers.updateRoomApprovedStatus)
// router.get("/categories-with-subcategories",CategoryControllers.getCategoriesWithSubCategories)

export const RoomRoutes = router;
