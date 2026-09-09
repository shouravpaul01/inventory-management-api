import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { LocationService } from "./location.service";

// ── Building Controllers ────────────────────────────────────
const createBuilding = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user?.id;
  const result = await LocationService.createBuilding(req.body, req.file, actorId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Building created successfully",
    data: result,
  });
});

const getAllBuildings = catchAsync(async (req: Request, res: Response) => {
  const result = await LocationService.getAllBuildings(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Buildings retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getBuildingById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await LocationService.getBuildingById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Building details retrieved successfully",
    data: result,
  });
});

const updateBuilding = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const actorId = req.user?.id;
  const result = await LocationService.updateBuilding(id, req.body, req.file, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Building updated successfully",
    data: result,
  });
});

const deleteBuilding = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const actorId = req.user?.id;
  const result = await LocationService.deleteBuilding(id, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// ── Floor Controllers ───────────────────────────────────────
const createFloor = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user?.id;
  const result = await LocationService.createFloor(req.body, req.file, actorId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Floor created successfully",
    data: result,
  });
});

const getAllFloors = catchAsync(async (req: Request, res: Response) => {
  const result = await LocationService.getAllFloors(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Floors retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getFloorById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await LocationService.getFloorById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Floor details retrieved successfully",
    data: result,
  });
});

const updateFloor = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const actorId = req.user?.id;
  const result = await LocationService.updateFloor(id, req.body, req.file, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Floor updated successfully",
    data: result,
  });
});

const deleteFloor = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const actorId = req.user?.id;
  const result = await LocationService.deleteFloor(id, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// ── Room Type Controllers ───────────────────────────────────
const createRoomType = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user?.id;
  const result = await LocationService.createRoomType(req.body, actorId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Room type created successfully",
    data: result,
  });
});

const getAllRoomTypes = catchAsync(async (req: Request, res: Response) => {
  const result = await LocationService.getAllRoomTypes(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room types retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getRoomTypeById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await LocationService.getRoomTypeById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room type details retrieved successfully",
    data: result,
  });
});

const updateRoomType = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const actorId = req.user?.id;
  const result = await LocationService.updateRoomType(id, req.body, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room type updated successfully",
    data: result,
  });
});

const deleteRoomType = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const actorId = req.user?.id;
  const result = await LocationService.deleteRoomType(id, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// ── Room Controllers ────────────────────────────────────────
const createRoom = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user?.id;
  const result = await LocationService.createRoom(req.body, req.file, actorId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Room created successfully",
    data: result,
  });
});

const getAllRooms = catchAsync(async (req: Request, res: Response) => {
  const result = await LocationService.getAllRooms(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rooms retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getRoomById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await LocationService.getRoomById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room details retrieved successfully",
    data: result,
  });
});

const updateRoom = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const actorId = req.user?.id;
  const result = await LocationService.updateRoom(id, req.body, req.file, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room updated successfully",
    data: result,
  });
});

const deleteRoom = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const actorId = req.user?.id;
  const result = await LocationService.deleteRoom(id, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// ── Stock Location Controllers ──────────────────────────────
const createStockLocation = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user?.id;
  const result = await LocationService.createStockLocation(req.body, req.file, actorId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Stock location created successfully",
    data: result,
  });
});

const getAllStockLocations = catchAsync(async (req: Request, res: Response) => {
  const result = await LocationService.getAllStockLocations(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stock locations retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getStockLocationById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await LocationService.getStockLocationById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stock location details retrieved successfully",
    data: result,
  });
});

const updateStockLocation = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const actorId = req.user?.id;
  const result = await LocationService.updateStockLocation(id, req.body, req.file, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stock location updated successfully",
    data: result,
  });
});

const deleteStockLocation = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const actorId = req.user?.id;
  const result = await LocationService.deleteStockLocation(id, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const LocationController = {
  // Building
  createBuilding,
  getAllBuildings,
  getBuildingById,
  updateBuilding,
  deleteBuilding,
  // Floor
  createFloor,
  getAllFloors,
  getFloorById,
  updateFloor,
  deleteFloor,
  // Room Type
  createRoomType,
  getAllRoomTypes,
  getRoomTypeById,
  updateRoomType,
  deleteRoomType,
  // Room
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  // Stock Location
  createStockLocation,
  getAllStockLocations,
  getStockLocationById,
  updateStockLocation,
  deleteStockLocation,
};
