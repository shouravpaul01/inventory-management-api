import express from "express";
import auth from "../../middlewares/auth";
import checkPermission from "../../middlewares/checkPermission";
import validateRequest from "../../middlewares/validateRequest";
import { InventoryUnitController } from "./inventoryUnit.controller";
import { InventoryUnitValidation } from "./inventoryUnit.validation";

const router = express.Router();

router.post(
  "/",
  auth(),
  checkPermission("inventory_unit.create"),
  validateRequest(InventoryUnitValidation.createInventoryUnitZodSchema),
  InventoryUnitController.createUnit
);

router.post(
  "/batch",
  auth(),
  checkPermission("inventory_unit.create"),
  validateRequest(InventoryUnitValidation.batchCreateUnitsZodSchema),
  InventoryUnitController.batchCreateUnits
);

router.get(
  "/lookup/:code",
  auth(),
  checkPermission("inventory_unit.qr_lookup"),
  InventoryUnitController.lookupByCodeOrQr
);

router.get(
  "/",
  auth(),
  checkPermission("inventory_unit.view"),
  InventoryUnitController.getAllUnits
);

router.get(
  "/:id",
  auth(),
  checkPermission("inventory_unit.view"),
  InventoryUnitController.getUnitById
);

router.patch(
  "/:id",
  auth(),
  checkPermission("inventory_unit.update"),
  validateRequest(InventoryUnitValidation.updateInventoryUnitZodSchema),
  InventoryUnitController.updateUnit
);

export const InventoryUnitRoutes = router;
