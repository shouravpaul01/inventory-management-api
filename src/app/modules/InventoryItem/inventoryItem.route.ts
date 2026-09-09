import express from "express";
import auth from "../../middlewares/auth";
import checkPermission from "../../middlewares/checkPermission";
import validateRequest from "../../middlewares/validateRequest";
import { fileUploader } from "../../middlewares/fileUploader";
import { parseBodyData } from "../../middlewares/parseBodyData";
import { InventoryItemController } from "./inventoryItem.controller";
import { InventoryItemValidation } from "./inventoryItem.validation";

const router = express.Router();

// ── CODE SEQUENCES ───────────────────────────────────────────
router.post(
  "/code-sequences",
  auth(),
  checkPermission("code_sequence.manage"),
  validateRequest(InventoryItemValidation.createCodeSequenceZodSchema),
  InventoryItemController.createCodeSequence
);

router.get(
  "/code-sequences",
  auth(),
  checkPermission("code_sequence.view"),
  InventoryItemController.getAllCodeSequences
);

router.get(
  "/code-sequences/:id",
  auth(),
  checkPermission("code_sequence.view"),
  InventoryItemController.getCodeSequenceById
);

router.patch(
  "/code-sequences/:id",
  auth(),
  checkPermission("code_sequence.manage"),
  validateRequest(InventoryItemValidation.updateCodeSequenceZodSchema),
  InventoryItemController.updateCodeSequence
);

// ── INVENTORY ITEMS ──────────────────────────────────────────
router.post(
  "/items",
  auth(),
  checkPermission("inventory.create"),
  fileUploader.single("image"),
  parseBodyData,
  validateRequest(InventoryItemValidation.createInventoryItemZodSchema),
  InventoryItemController.createInventoryItem
);

router.get(
  "/items",
  auth(),
  checkPermission("inventory.view"),
  InventoryItemController.getAllInventoryItems
);

router.get(
  "/items/:id",
  auth(),
  checkPermission("inventory.view"),
  InventoryItemController.getInventoryItemById
);

router.patch(
  "/items/:id",
  auth(),
  checkPermission("inventory.update"),
  fileUploader.single("image"),
  parseBodyData,
  validateRequest(InventoryItemValidation.updateInventoryItemZodSchema),
  InventoryItemController.updateInventoryItem
);

router.delete(
  "/items/:id",
  auth(),
  checkPermission("inventory.delete"),
  InventoryItemController.deleteInventoryItem
);

export const InventoryItemRoutes = router;
