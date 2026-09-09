import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../helpers/queryBuilder";
import prisma from "../../../shared/prisma";
import { uploadToCloudinary, deleteFromCloudinary } from "../../../helpers/cloudinary";

// ════════════════════════════════════════════════════════════
// 1. BUILDING SERVICE
// ════════════════════════════════════════════════════════════

const createBuilding = async (
  payload: { name: string; code: string; description?: string; address?: string },
  file?: Express.Multer.File,
  actorId?: string
) => {
  const existing = await prisma.building.findUnique({
    where: { code: payload.code },
  });

  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, `Building code '${payload.code}' already exists!`);
  }

  let imageUrl: string | undefined;
  let imagePublicId: string | undefined;

  if (file) {
    const uploadRes = await uploadToCloudinary(file, "inventory/buildings");
    imageUrl = uploadRes.imageUrl;
    imagePublicId = uploadRes.imagePublicId;
  }

  const building = await prisma.building.create({
    data: {
      ...payload,
      imageUrl,
      imagePublicId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "CREATE",
      module: "Location",
      entityType: "Building",
      entityId: building.id,
      afterData: building as any,
    },
  });

  return building;
};

const getAllBuildings = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.building as any, query, {
    fields: {
      name: { type: "string", searchable: true, sortable: true, filterable: true },
      code: { type: "string", searchable: true, sortable: true, filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["name", "code", "description", "address"])
    .filter()
    .sort()
    .paginate()
    .include({
      _count: {
        select: {
          floors: true,
        },
      },
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const getBuildingById = async (id: string) => {
  const building = await prisma.building.findUnique({
    where: { id },
    include: {
      floors: {
        include: {
          _count: {
            select: {
              rooms: true,
              locations: true,
            },
          },
        },
      },
    },
  });

  if (!building) {
    throw new ApiError(httpStatus.NOT_FOUND, "Building not found!");
  }

  return building;
};

const updateBuilding = async (
  id: string,
  payload: { name?: string; description?: string; address?: string },
  file?: Express.Multer.File,
  actorId?: string
) => {
  const before = await getBuildingById(id);

  let imageUrl = before.imageUrl;
  let imagePublicId = before.imagePublicId;

  if (file) {
    if (imagePublicId) {
      await deleteFromCloudinary(imagePublicId);
    }
    const uploadRes = await uploadToCloudinary(file, "inventory/buildings");
    imageUrl = uploadRes.imageUrl;
    imagePublicId = uploadRes.imagePublicId;
  }

  const updated = await prisma.building.update({
    where: { id },
    data: {
      ...payload,
      imageUrl,
      imagePublicId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "UPDATE",
      module: "Location",
      entityType: "Building",
      entityId: id,
      beforeData: before as any,
      afterData: updated as any,
    },
  });

  return updated;
};

const deleteBuilding = async (id: string, actorId?: string) => {
  const building = await getBuildingById(id);

  const floorCount = await prisma.floor.count({
    where: { buildingId: id },
  });

  if (floorCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete building because it has ${floorCount} floor(s)! Delete or reassign floors first.`
    );
  }

  if (building.imagePublicId) {
    await deleteFromCloudinary(building.imagePublicId);
  }

  await prisma.building.delete({
    where: { id },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "DELETE",
      module: "Location",
      entityType: "Building",
      entityId: id,
      beforeData: building as any,
    },
  });

  return { message: "Building deleted successfully!" };
};

// ════════════════════════════════════════════════════════════
// 2. FLOOR SERVICE
// ════════════════════════════════════════════════════════════

const createFloor = async (
  payload: { buildingId: string; name: string; code: string; floorNumber?: number },
  file?: Express.Multer.File,
  actorId?: string
) => {
  const building = await prisma.building.findUnique({
    where: { id: payload.buildingId },
  });

  if (!building) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Specified building does not exist!");
  }

  let imageUrl: string | undefined;
  let imagePublicId: string | undefined;

  if (file) {
    const uploadRes = await uploadToCloudinary(file, "inventory/floors");
    imageUrl = uploadRes.imageUrl;
    imagePublicId = uploadRes.imagePublicId;
  }

  const floor = await prisma.floor.create({
    data: {
      ...payload,
      imageUrl,
      imagePublicId,
    },
    include: {
      building: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "CREATE",
      module: "Location",
      entityType: "Floor",
      entityId: floor.id,
      afterData: floor as any,
    },
  });

  return floor;
};

const getAllFloors = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.floor as any, query, {
    fields: {
      name: { type: "string", searchable: true, sortable: true, filterable: true },
      code: { type: "string", searchable: true, sortable: true, filterable: true },
      floorNumber: { type: "number", sortable: true, filterable: true },
      buildingId: { type: "string", filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["name", "code"])
    .filter()
    .sort()
    .paginate()
    .include({
      building: true,
      _count: {
        select: {
          rooms: true,
          locations: true,
        },
      },
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const getFloorById = async (id: string) => {
  const floor = await prisma.floor.findUnique({
    where: { id },
    include: {
      building: true,
      rooms: {
        include: {
          roomType: true,
          _count: {
            select: {
              locations: true,
            },
          },
        },
      },
      locations: true,
    },
  });

  if (!floor) {
    throw new ApiError(httpStatus.NOT_FOUND, "Floor not found!");
  }

  return floor;
};

const updateFloor = async (
  id: string,
  payload: { name?: string; code?: string; floorNumber?: number },
  file?: Express.Multer.File,
  actorId?: string
) => {
  const before = await getFloorById(id);

  let imageUrl = before.imageUrl;
  let imagePublicId = before.imagePublicId;

  if (file) {
    if (imagePublicId) {
      await deleteFromCloudinary(imagePublicId);
    }
    const uploadRes = await uploadToCloudinary(file, "inventory/floors");
    imageUrl = uploadRes.imageUrl;
    imagePublicId = uploadRes.imagePublicId;
  }

  const updated = await prisma.floor.update({
    where: { id },
    data: {
      ...payload,
      imageUrl,
      imagePublicId,
    },
    include: {
      building: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "UPDATE",
      module: "Location",
      entityType: "Floor",
      entityId: id,
      beforeData: before as any,
      afterData: updated as any,
    },
  });

  return updated;
};

const deleteFloor = async (id: string, actorId?: string) => {
  const floor = await getFloorById(id);

  const roomCount = await prisma.room.count({
    where: { floorId: id },
  });

  if (roomCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete floor because it has ${roomCount} room(s)! Delete rooms first.`
    );
  }

  if (floor.imagePublicId) {
    await deleteFromCloudinary(floor.imagePublicId);
  }

  await prisma.floor.delete({
    where: { id },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "DELETE",
      module: "Location",
      entityType: "Floor",
      entityId: id,
      beforeData: floor as any,
    },
  });

  return { message: "Floor deleted successfully!" };
};

// ════════════════════════════════════════════════════════════
// 3. ROOM TYPE SERVICE
// ════════════════════════════════════════════════════════════

const createRoomType = async (
  payload: { name: string; code: string; description?: string },
  actorId?: string
) => {
  const existing = await prisma.roomType.findUnique({
    where: { code: payload.code },
  });

  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, `Room type code '${payload.code}' already exists!`);
  }

  const roomType = await prisma.roomType.create({
    data: payload,
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "CREATE",
      module: "Location",
      entityType: "RoomType",
      entityId: roomType.id,
      afterData: roomType as any,
    },
  });

  return roomType;
};

const getAllRoomTypes = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.roomType as any, query, {
    fields: {
      name: { type: "string", searchable: true, sortable: true, filterable: true },
      code: { type: "string", searchable: true, sortable: true, filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["name", "code", "description"])
    .filter()
    .sort()
    .paginate()
    .include({
      _count: {
        select: {
          rooms: true,
        },
      },
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const getRoomTypeById = async (id: string) => {
  const roomType = await prisma.roomType.findUnique({
    where: { id },
    include: {
      rooms: true,
      _count: {
        select: {
          rooms: true,
        },
      },
    },
  });

  if (!roomType) {
    throw new ApiError(httpStatus.NOT_FOUND, "Room type not found!");
  }

  return roomType;
};

const updateRoomType = async (
  id: string,
  payload: { name?: string; description?: string },
  actorId?: string
) => {
  const before = await getRoomTypeById(id);

  const updated = await prisma.roomType.update({
    where: { id },
    data: payload,
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "UPDATE",
      module: "Location",
      entityType: "RoomType",
      entityId: id,
      beforeData: before as any,
      afterData: updated as any,
    },
  });

  return updated;
};

const deleteRoomType = async (id: string, actorId?: string) => {
  const roomType = await getRoomTypeById(id);

  const roomCount = await prisma.room.count({
    where: { roomTypeId: id },
  });

  if (roomCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete room type because ${roomCount} room(s) are assigned to it!`
    );
  }

  await prisma.roomType.delete({
    where: { id },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "DELETE",
      module: "Location",
      entityType: "RoomType",
      entityId: id,
      beforeData: roomType as any,
    },
  });

  return { message: "Room type deleted successfully!" };
};

// ════════════════════════════════════════════════════════════
// 4. ROOM SERVICE
// ════════════════════════════════════════════════════════════

const createRoom = async (
  payload: {
    floorId: string;
    roomTypeId?: string;
    name: string;
    code: string;
    capacity?: number;
    description?: string;
    status?: "ACTIVE" | "MAINTENANCE" | "INACTIVE";
  },
  file?: Express.Multer.File,
  actorId?: string
) => {
  const floor = await prisma.floor.findUnique({
    where: { id: payload.floorId },
  });

  if (!floor) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Specified floor does not exist!");
  }

  if (payload.roomTypeId) {
    const rt = await prisma.roomType.findUnique({
      where: { id: payload.roomTypeId },
    });
    if (!rt) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Specified room type does not exist!");
    }
  }

  const existing = await prisma.room.findUnique({
    where: { code: payload.code },
  });

  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, `Room code '${payload.code}' already exists!`);
  }

  let imageUrl: string | undefined;
  let imagePublicId: string | undefined;

  if (file) {
    const uploadRes = await uploadToCloudinary(file, "inventory/rooms");
    imageUrl = uploadRes.imageUrl;
    imagePublicId = uploadRes.imagePublicId;
  }

  const room = await prisma.room.create({
    data: {
      name: payload.name,
      code: payload.code,
      floorId: payload.floorId,
      roomTypeId: payload.roomTypeId,
      capacity: payload.capacity,
      description: payload.description,
      status: (payload.status as any) || "ACTIVE",
      imageUrl,
      imagePublicId,
    },
    include: {
      floor: {
        include: {
          building: true,
        },
      },
      roomType: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "CREATE",
      module: "Location",
      entityType: "Room",
      entityId: room.id,
      afterData: room as any,
    },
  });

  return room;
};

const getAllRooms = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.room as any, query, {
    fields: {
      name: { type: "string", searchable: true, sortable: true, filterable: true },
      code: { type: "string", searchable: true, sortable: true, filterable: true },
      status: { type: "string", sortable: true, filterable: true },
      floorId: { type: "string", filterable: true },
      roomTypeId: { type: "string", filterable: true },
      capacity: { type: "number", sortable: true, filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["name", "code", "description"])
    .filter()
    .sort()
    .paginate()
    .include({
      floor: {
        include: {
          building: true,
        },
      },
      roomType: true,
      _count: {
        select: {
          locations: true,
        },
      },
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const getRoomById = async (id: string) => {
  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      floor: {
        include: {
          building: true,
        },
      },
      roomType: true,
      locations: true,
    },
  });

  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, "Room not found!");
  }

  return room;
};

const updateRoom = async (
  id: string,
  payload: {
    floorId?: string;
    roomTypeId?: string;
    name?: string;
    capacity?: number;
    description?: string;
    status?: "ACTIVE" | "INACTIVE";
  },
  file?: Express.Multer.File,
  actorId?: string
) => {
  const before = await getRoomById(id);

  let imageUrl = before.imageUrl;
  let imagePublicId = before.imagePublicId;

  if (file) {
    if (imagePublicId) {
      await deleteFromCloudinary(imagePublicId);
    }
    const uploadRes = await uploadToCloudinary(file, "inventory/rooms");
    imageUrl = uploadRes.imageUrl;
    imagePublicId = uploadRes.imagePublicId;
  }

  const updated = await prisma.room.update({
    where: { id },
    data: {
      ...(payload as any),
      imageUrl,
      imagePublicId,
    },
    include: {
      floor: {
        include: {
          building: true,
        },
      },
      roomType: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "UPDATE",
      module: "Location",
      entityType: "Room",
      entityId: id,
      beforeData: before as any,
      afterData: updated as any,
    },
  });

  return updated;
};

const deleteRoom = async (id: string, actorId?: string) => {
  const room = await getRoomById(id);

  const locationCount = await prisma.stockLocation.count({
    where: { roomId: id },
  });

  if (locationCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete room because it contains ${locationCount} storage location(s)!`
    );
  }

  if (room.imagePublicId) {
    await deleteFromCloudinary(room.imagePublicId);
  }

  await prisma.room.delete({
    where: { id },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "DELETE",
      module: "Location",
      entityType: "Room",
      entityId: id,
      beforeData: room as any,
    },
  });

  return { message: "Room deleted successfully!" };
};

// ════════════════════════════════════════════════════════════
// 5. STOCK LOCATION SERVICE (RACK, SHELF, STORE, ETC.)
// ════════════════════════════════════════════════════════════

const createStockLocation = async (
  payload: {
    name: string;
    code: string;
    type: "STORE" | "ROOM" | "RACK" | "SHELF" | "CABINET" | "OTHER";
    description?: string;
    buildingId?: string;
    floorId?: string;
    roomId?: string;
  },
  file?: Express.Multer.File,
  actorId?: string
) => {
  const existing = await prisma.stockLocation.findUnique({
    where: { code: payload.code },
  });

  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, `Stock location code '${payload.code}' already exists!`);
  }

  if (payload.roomId) {
    const rm = await prisma.room.findUnique({
      where: { id: payload.roomId },
    });
    if (!rm) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Specified room does not exist!");
    }
  }

  let imageUrl: string | undefined;
  let imagePublicId: string | undefined;

  if (file) {
    const uploadRes = await uploadToCloudinary(file, "inventory/locations");
    imageUrl = uploadRes.imageUrl;
    imagePublicId = uploadRes.imagePublicId;
  }

  const location = await prisma.stockLocation.create({
    data: {
      ...payload,
      imageUrl,
      imagePublicId,
    },
    include: {
      room: true,
      floor: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "CREATE",
      module: "Location",
      entityType: "StockLocation",
      entityId: location.id,
      afterData: location as any,
    },
  });

  return location;
};

const getAllStockLocations = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.stockLocation as any, query, {
    fields: {
      name: { type: "string", searchable: true, sortable: true, filterable: true },
      code: { type: "string", searchable: true, sortable: true, filterable: true },
      type: { type: "string", sortable: true, filterable: true },
      buildingId: { type: "string", filterable: true },
      floorId: { type: "string", filterable: true },
      roomId: { type: "string", filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["name", "code", "description"])
    .filter()
    .sort()
    .paginate()
    .include({
      room: {
        include: {
          floor: {
            include: {
              building: true,
            },
          },
        },
      },
      floor: true,
      _count: {
        select: {
          stockBalances: true,
          inventoryUnits: true,
        },
      },
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const getStockLocationById = async (id: string) => {
  const location = await prisma.stockLocation.findUnique({
    where: { id },
    include: {
      room: {
        include: {
          floor: {
            include: {
              building: true,
            },
          },
        },
      },
      floor: true,
      stockBalances: {
        include: {
          inventoryItem: true,
        },
      },
      inventoryUnits: {
        take: 20,
        include: {
          inventoryItem: true,
        },
      },
    },
  });

  if (!location) {
    throw new ApiError(httpStatus.NOT_FOUND, "Stock location not found!");
  }

  return location;
};

const updateStockLocation = async (
  id: string,
  payload: {
    name?: string;
    type?: "STORE" | "ROOM" | "RACK" | "SHELF" | "CABINET" | "OTHER";
    description?: string;
    buildingId?: string;
    floorId?: string;
    roomId?: string;
  },
  file?: Express.Multer.File,
  actorId?: string
) => {
  const before = await getStockLocationById(id);

  let imageUrl = before.imageUrl;
  let imagePublicId = before.imagePublicId;

  if (file) {
    if (imagePublicId) {
      await deleteFromCloudinary(imagePublicId);
    }
    const uploadRes = await uploadToCloudinary(file, "inventory/locations");
    imageUrl = uploadRes.imageUrl;
    imagePublicId = uploadRes.imagePublicId;
  }

  const updated = await prisma.stockLocation.update({
    where: { id },
    data: {
      ...payload,
      imageUrl,
      imagePublicId,
    },
    include: {
      room: true,
      floor: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "UPDATE",
      module: "Location",
      entityType: "StockLocation",
      entityId: id,
      beforeData: before as any,
      afterData: updated as any,
    },
  });

  return updated;
};

const deleteStockLocation = async (id: string, actorId?: string) => {
  const location = await getStockLocationById(id);

  const balanceCount = await prisma.stockBalance.count({
    where: { locationId: id, quantity: { gt: 0 } },
  });

  if (balanceCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot delete stock location because it currently holds active stock balances!"
    );
  }

  const unitCount = await prisma.inventoryUnit.count({
    where: { locationId: id, status: "IN_STOCK" },
  });

  if (unitCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete stock location because ${unitCount} physical asset(s) are stored here!`
    );
  }

  if (location.imagePublicId) {
    await deleteFromCloudinary(location.imagePublicId);
  }

  await prisma.stockLocation.delete({
    where: { id },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "DELETE",
      module: "Location",
      entityType: "StockLocation",
      entityId: id,
      beforeData: location as any,
    },
  });

  return { message: "Stock location deleted successfully!" };
};

export const LocationService = {
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
