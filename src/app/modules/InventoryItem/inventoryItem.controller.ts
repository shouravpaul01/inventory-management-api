import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { InventoryItemService } from "./inventoryItem.service";

// ── Item Handlers ────────────────────────────────────────────
const createInventoryItem = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user?.id;
  const result = await InventoryItemService.createInventoryItem(
    req.body,
    req.file,
    actorId
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Inventory item created successfully",
    data: result,
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
  const actorId = req.user?.id;
  const result = await InventoryItemService.updateInventoryItem(
    id,
    req.body,
    req.file,
    actorId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Inventory item updated successfully",
    data: result,
  });
});

const deleteInventoryItem = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const actorId = req.user?.id;
  const result = await InventoryItemService.deleteInventoryItem(id, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
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
