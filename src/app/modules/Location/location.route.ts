import express from "express";
import auth from "../../middlewares/auth";
import checkPermission from "../../middlewares/checkPermission";
import validateRequest from "../../middlewares/validateRequest";
import { fileUploader } from "../../middlewares/fileUploader";
import { parseBodyData } from "../../middlewares/parseBodyData";
import { LocationController } from "./location.controller";
import { LocationValidation } from "./location.validation";

const router = express.Router();

// ── 1. BUILDINGS ─────────────────────────────────────────────
router.post(
  "/buildings",
  auth(),
  checkPermission("location.create"),
  fileUploader.single("image"),
  parseBodyData,
  validateRequest(LocationValidation.createBuildingZodSchema),
  LocationController.createBuilding
);

router.get(
  "/buildings",
  auth(),
  checkPermission("location.view"),
  LocationController.getAllBuildings
);

router.get(
  "/buildings/:id",
  auth(),
  checkPermission("location.view"),
  LocationController.getBuildingById
);

router.patch(
  "/buildings/:id",
  auth(),
  checkPermission("location.update"),
  fileUploader.single("image"),
  parseBodyData,
  validateRequest(LocationValidation.updateBuildingZodSchema),
  LocationController.updateBuilding
);

router.delete(
  "/buildings/:id",
  auth(),
  checkPermission("location.delete"),
  LocationController.deleteBuilding
);

// ── 2. FLOORS ────────────────────────────────────────────────
router.post(
  "/floors",
  auth(),
  checkPermission("location.create"),
  fileUploader.single("image"),
  parseBodyData,
  validateRequest(LocationValidation.createFloorZodSchema),
  LocationController.createFloor
);

router.get(
  "/floors",
  auth(),
  checkPermission("location.view"),
  LocationController.getAllFloors
);

router.get(
  "/floors/:id",
  auth(),
  checkPermission("location.view"),
  LocationController.getFloorById
);

router.patch(
  "/floors/:id",
  auth(),
  checkPermission("location.update"),
  fileUploader.single("image"),
  parseBodyData,
  validateRequest(LocationValidation.updateFloorZodSchema),
  LocationController.updateFloor
);

router.delete(
  "/floors/:id",
  auth(),
  checkPermission("location.delete"),
  LocationController.deleteFloor
);

// ── 3. ROOM TYPES ────────────────────────────────────────────
router.post(
  "/room-types",
  auth(),
  checkPermission("location.create"),
  validateRequest(LocationValidation.createRoomTypeZodSchema),
  LocationController.createRoomType
);

router.get(
  "/room-types",
  auth(),
  checkPermission("location.view"),
  LocationController.getAllRoomTypes
);

router.get(
  "/room-types/:id",
  auth(),
  checkPermission("location.view"),
  LocationController.getRoomTypeById
);

router.patch(
  "/room-types/:id",
  auth(),
  checkPermission("location.update"),
  validateRequest(LocationValidation.updateRoomTypeZodSchema),
  LocationController.updateRoomType
);

router.delete(
  "/room-types/:id",
  auth(),
  checkPermission("location.delete"),
  LocationController.deleteRoomType
);

// ── 4. ROOMS ─────────────────────────────────────────────────
router.post(
  "/rooms",
  auth(),
  checkPermission("location.create"),
  fileUploader.single("image"),
  parseBodyData,
  validateRequest(LocationValidation.createRoomZodSchema),
  LocationController.createRoom
);

router.get(
  "/rooms",
  auth(),
  checkPermission("location.view"),
  LocationController.getAllRooms
);

router.get(
  "/rooms/:id",
  auth(),
  checkPermission("location.view"),
  LocationController.getRoomById
);

router.patch(
  "/rooms/:id",
  auth(),
  checkPermission("location.update"),
  fileUploader.single("image"),
  parseBodyData,
  validateRequest(LocationValidation.updateRoomZodSchema),
  LocationController.updateRoom
);

router.delete(
  "/rooms/:id",
  auth(),
  checkPermission("location.delete"),
  LocationController.deleteRoom
);

// ── 5. STOCK LOCATIONS ───────────────────────────────────────
router.post(
  "/stock-locations",
  auth(),
  checkPermission("location.create"),
  fileUploader.single("image"),
  parseBodyData,
  validateRequest(LocationValidation.createStockLocationZodSchema),
  LocationController.createStockLocation
);

router.get(
  "/stock-locations",
  auth(),
  checkPermission("location.view"),
  LocationController.getAllStockLocations
);

router.get(
  "/stock-locations/:id",
  auth(),
  checkPermission("location.view"),
  LocationController.getStockLocationById
);

router.patch(
  "/stock-locations/:id",
  auth(),
  checkPermission("location.update"),
  fileUploader.single("image"),
  parseBodyData,
  validateRequest(LocationValidation.updateStockLocationZodSchema),
  LocationController.updateStockLocation
);

router.delete(
  "/stock-locations/:id",
  auth(),
  checkPermission("location.delete"),
  LocationController.deleteStockLocation
);

export const LocationRoutes = router;
