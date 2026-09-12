import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { InventoryUnitService } from "./inventoryUnit.service";

const createUnit = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user?.id;
  const result = await InventoryUnitService.createUnit(req.body, actorId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Serialized inventory unit created successfully",
    data: result,
  });
});

const batchCreateUnits = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user?.id;
  const result = await InventoryUnitService.batchCreateUnits(req.body, actorId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `${result.length} serialized inventory units created successfully`,
    data: result,
  });
});

const lookupByCodeOrQr = catchAsync(async (req: Request, res: Response) => {
  const identifier = req.params.code as string;
  const result = await InventoryUnitService.lookupByCodeOrQr(identifier);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Asset details retrieved successfully",
    data: result,
  });
});

const getAllUnits = catchAsync(async (req: Request, res: Response) => {
  const result = await InventoryUnitService.getAllUnits(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Serialized inventory units retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getUnitById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await InventoryUnitService.getUnitById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Inventory unit details retrieved successfully",
    data: result,
  });
});

const updateUnit = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const actorId = req.user?.id;
  const result = await InventoryUnitService.updateUnit(id, req.body, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Inventory unit updated successfully",
    data: result,
  });
});

export const InventoryUnitController = {
  createUnit,
  batchCreateUnits,
  lookupByCodeOrQr,
  getAllUnits,
  getUnitById,
  updateUnit,
};
