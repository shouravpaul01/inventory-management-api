import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { InventoryItemService } from "./inventoryItem.service";
import { ApprovalInterceptor } from "../Approval/approval.interceptor";
import { ApprovalEntityType } from "@prisma/client";

// ── Item Handlers ────────────────────────────────────────────
const createInventoryItem = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await ApprovalInterceptor.executeOrIntercept({
    permissionCode: "inventory.create",
    entityType: ApprovalEntityType.INVENTORY_ITEM,
    action: "CREATE",
    user,
    payload: req.body,
    summary: `Create Inventory Item '${req.body.name}' (SKU: ${req.body.sku || "N/A"})`,
    executeDirectly: () =>
      InventoryItemService.createInventoryItem(req.body, req.file, user.id),
  });

  sendResponse(res, {
    statusCode: result.approvalRequired ? httpStatus.ACCEPTED : httpStatus.CREATED,
    success: true,
    message: result.approvalRequired
      ? "Inventory item creation submitted for Super Admin approval"
      : "Inventory item created successfully",
    data: result.data,
  });
});

const getAllInventoryItems = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryItemService.getAllInventoryItems(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Inventory items retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getInventoryItemById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await InventoryItemService.getInventoryItemById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Inventory item details retrieved successfully",
    data: result,
  });
});

const updateInventoryItem = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = req.user!;
  const result = await ApprovalInterceptor.executeOrIntercept({
    permissionCode: "inventory.update",
    entityType: ApprovalEntityType.INVENTORY_ITEM,
    action: "UPDATE",
    entityId: id,
    user,
    payload: req.body,
    summary: `Update Inventory Item '${id}'`,
    executeDirectly: () =>
      InventoryItemService.updateInventoryItem(id, req.body, req.file, user.id),
  });

  sendResponse(res, {
    statusCode: result.approvalRequired ? httpStatus.ACCEPTED : httpStatus.OK,
    success: true,
    message: result.approvalRequired
      ? "Inventory item update submitted for Super Admin approval"
      : "Inventory item updated successfully",
    data: result.data,
  });
});

const deleteInventoryItem = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = req.user!;
  const result = await ApprovalInterceptor.executeOrIntercept({
    permissionCode: "inventory.delete",
    entityType: ApprovalEntityType.INVENTORY_ITEM,
    action: "DELETE",
    entityId: id,
    user,
    payload: {},
    summary: `Delete Inventory Item '${id}'`,
    executeDirectly: () =>
      InventoryItemService.deleteInventoryItem(id, user.id),
  });

  sendResponse(res, {
    statusCode: result.approvalRequired ? httpStatus.ACCEPTED : httpStatus.OK,
    success: true,
    message: result.approvalRequired
      ? "Inventory item deletion submitted for Super Admin approval"
      : "Inventory item deleted successfully",
    data: result.data,
  });
});

// ── Code Sequence Handlers ───────────────────────────────────
const createCodeSequence = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user?.id;
  const result = await InventoryItemService.createCodeSequence(req.body, actorId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Code sequence created successfully",
    data: result,
  });
});

const getAllCodeSequences = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryItemService.getAllCodeSequences(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Code sequences retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getCodeSequenceById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await InventoryItemService.getCodeSequenceById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Code sequence retrieved successfully",
    data: result,
  });
});

const updateCodeSequence = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const actorId = req.user?.id;
  const result = await InventoryItemService.updateCodeSequence(id, req.body, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Code sequence updated successfully",
    data: result,
  });
});

export const InventoryItemController = {
  createInventoryItem,
  getAllInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
  createCodeSequence,
  getAllCodeSequences,
  getCodeSequenceById,
  updateCodeSequence,
};
