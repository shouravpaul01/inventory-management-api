import { z } from "zod";

// Building
const createBuildingZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Building name is required"),
    code: z.string().min(1, "Building code is required").transform((c) => c.toUpperCase()),
    description: z.string().optional(),
    address: z.string().optional(),
  }),
});

const updateBuildingZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    address: z.string().optional(),
  }),
});

// Floor
const createFloorZodSchema = z.object({
  body: z.object({
    buildingId: z.string().min(1, "Building ID is required"),
    name: z.string().min(1, "Floor name is required"),
    code: z.string().min(1, "Floor code is required").transform((c) => c.toUpperCase()),
    floorNumber: z.coerce.number().optional(),
  }),
});

const updateFloorZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    code: z.string().optional().transform((c) => (c ? c.toUpperCase() : undefined)),
    floorNumber: z.coerce.number().optional(),
  }),
});

// Room Type
const createRoomTypeZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Room type name is required"),
    code: z.string().min(1, "Room type code is required").transform((c) => c.toUpperCase()),
    description: z.string().optional(),
  }),
});

const updateRoomTypeZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
  }),
});

// Room
const createRoomZodSchema = z.object({
  body: z.object({
    floorId: z.string().min(1, "Floor ID is required"),
    roomTypeId: z.string().optional(),
    name: z.string().min(1, "Room name is required"),
    code: z.string().min(1, "Room code is required").transform((c) => c.toUpperCase()),
    capacity: z.coerce.number().optional(),
    description: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
  }),
});

const updateRoomZodSchema = z.object({
  body: z.object({
    floorId: z.string().optional(),
    roomTypeId: z.string().optional(),
    name: z.string().optional(),
    capacity: z.coerce.number().optional(),
    description: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  }),
});

// Stock Location
const createStockLocationZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Location name is required"),
    code: z.string().min(1, "Location code is required").transform((c) => c.toUpperCase()),
    type: z.enum(["STORE", "ROOM", "RACK", "SHELF", "CABINET", "OTHER"]),
    description: z.string().optional(),
    buildingId: z.string().optional(),
    floorId: z.string().optional(),
    roomId: z.string().optional(),
  }),
});

const updateStockLocationZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    type: z.enum(["STORE", "ROOM", "RACK", "SHELF", "CABINET", "OTHER"]).optional(),
    description: z.string().optional(),
    buildingId: z.string().optional(),
    floorId: z.string().optional(),
    roomId: z.string().optional(),
  }),
});

export const LocationValidation = {
  createBuildingZodSchema,
  updateBuildingZodSchema,
  createFloorZodSchema,
  updateFloorZodSchema,
  createRoomTypeZodSchema,
  updateRoomTypeZodSchema,
  createRoomZodSchema,
  updateRoomZodSchema,
  createStockLocationZodSchema,
  updateStockLocationZodSchema,
};
