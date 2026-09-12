import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../helpers/queryBuilder";
import prisma from "../../../shared/prisma";
import { generateSequentialCode } from "../../../helpers/sequenceGenerator";
import { ConditionStatus, InventoryUnitStatus, StockMovementType } from "@prisma/client";
import {
  IBatchCreateUnitsPayload,
  ICreateInventoryUnitPayload,
  IUpdateInventoryUnitPayload,
} from "./inventoryUnit.interface";
import { generateQrValue, getAssetPrefix } from "./inventoryUnit.utils";
import { AuditService } from "../Audit/audit.service";

const createUnit = async (
  payload: ICreateInventoryUnitPayload,
  actorId?: string
) => {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: payload.inventoryItemId },
  });

  if (!item) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Inventory item does not exist!");
  }

  if (item.trackingType !== "SERIALIZED") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot create individual physical unit for bulk-tracked item '${item.name}'! Use stock balances instead.`
    );
  }

  if (payload.locationId) {
    const loc = await prisma.stockLocation.findUnique({
      where: { id: payload.locationId },
    });
    if (!loc) throw new ApiError(httpStatus.BAD_REQUEST, "Specified stock location does not exist!");
  }

  // Generate uniqueCode if not provided
  let uniqueCode = payload.uniqueCode?.trim().toUpperCase();
  if (!uniqueCode) {
    const prefix = getAssetPrefix(item.code);
    uniqueCode = await generateSequentialCode(`${prefix}_UNIT_SEQ`, prefix);
  } else {
    const existing = await prisma.inventoryUnit.findUnique({
      where: { uniqueCode },
    });
    if (existing) {
      throw new ApiError(httpStatus.CONFLICT, `Unique code '${uniqueCode}' already exists!`);
    }
  }

  const qrValue = generateQrValue(uniqueCode);

  const unit = await prisma.inventoryUnit.create({
    data: {
      inventoryItemId: item.id,
      uniqueCode,
      serialNumber: payload.serialNumber,
      barcode: payload.barcode || uniqueCode,
      qrValue,
      condition: (payload.condition as ConditionStatus) || ConditionStatus.NEW,
      status: InventoryUnitStatus.IN_STOCK,
      locationId: payload.locationId,
      purchaseDate: payload.purchaseDate ? new Date(payload.purchaseDate) : null,
      warrantyEndDate: payload.warrantyEndDate ? new Date(payload.warrantyEndDate) : null,
      notes: payload.notes,
    },
    include: {
      inventoryItem: true,
      location: true,
    },
  });

  // Record initial intake stock movement if location was assigned
  if (payload.locationId && actorId) {
    const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
    await prisma.stockMovement.create({
      data: {
        movementNumber,
        type: StockMovementType.STOCK_IN,
        inventoryItemId: item.id,
        inventoryUnitId: unit.id,
        quantity: 1,
        toLocationId: payload.locationId,
        performedById: actorId,
        notes: "Initial serialized unit registration into storage",
      },
    });
  }

  // Audit log
  await AuditService.logCreate({
    module: "InventoryUnit",
    entityType: "InventoryUnit",
    entityId: unit.id,
    actorId,
    afterData: unit as any,
  });

  return unit;
};

const batchCreateUnits = async (
  payload: IBatchCreateUnitsPayload,
  actorId?: string
) => {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: payload.inventoryItemId },
  });

  if (!item) throw new ApiError(httpStatus.BAD_REQUEST, "Inventory item does not exist!");

  if (item.trackingType !== "SERIALIZED") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot batch create serialized units for bulk-tracked item '${item.name}'!`
    );
  }

  if (payload.locationId) {
    const loc = await prisma.stockLocation.findUnique({ where: { id: payload.locationId } });
    if (!loc) throw new ApiError(httpStatus.BAD_REQUEST, "Specified stock location does not exist!");
  }

  const prefix = getAssetPrefix(item.code);
  const createdUnits: any[] = [];

  for (let i = 0; i < payload.count; i++) {
    const uniqueCode = await generateSequentialCode(`${prefix}_UNIT_SEQ`, prefix);
    const qrValue = generateQrValue(uniqueCode);

    const unit = await prisma.inventoryUnit.create({
      data: {
        inventoryItemId: item.id,
        uniqueCode,
        barcode: uniqueCode,
        qrValue,
        condition: (payload.condition as ConditionStatus) || ConditionStatus.NEW,
        status: InventoryUnitStatus.IN_STOCK,
        locationId: payload.locationId,
        purchaseDate: payload.purchaseDate ? new Date(payload.purchaseDate) : null,
        warrantyEndDate: payload.warrantyEndDate ? new Date(payload.warrantyEndDate) : null,
        notes: payload.notes,
      },
    });

    if (payload.locationId && actorId) {
      const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
      await prisma.stockMovement.create({
        data: {
          movementNumber,
          type: StockMovementType.STOCK_IN,
          inventoryItemId: item.id,
          inventoryUnitId: unit.id,
          quantity: 1,
          toLocationId: payload.locationId,
          performedById: actorId,
          notes: "Batch intake intake registration",
        },
      });
    }

    createdUnits.push(unit);
  }

  await AuditService.logCreate({
    module: "InventoryUnit",
    entityType: "InventoryUnit",
    entityId: item.id,
    actorId,
    metadata: { count: payload.count, prefix },
  });

  return createdUnits;
};

const lookupByCodeOrQr = async (identifier: string) => {
  const clean = identifier.trim();

  const unit = await prisma.inventoryUnit.findFirst({
    where: {
      OR: [
        { uniqueCode: clean },
        { qrValue: clean },
        { barcode: clean },
        { serialNumber: clean },
      ],
    },
    include: {
      inventoryItem: {
        include: {
          category: true,
        },
      },
      location: {
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
        },
      },
      movements: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          fromLocation: true,
          toLocation: true,
        },
      },
    },
  });

  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, `No asset found matching identifier '${identifier}'!`);
  }

  let currentHolder = null;
  if (unit.currentHolderId) {
    currentHolder = await prisma.user.findUnique({
      where: { id: unit.currentHolderId },
      select: {
        id: true,
        employeeId: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });
  }

  return {
    ...unit,
    currentHolder,
  };
};

const getAllUnits = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.inventoryUnit as any, query, {
    fields: {
      uniqueCode: { type: "string", searchable: true, sortable: true, filterable: true },
      serialNumber: { type: "string", searchable: true, sortable: true, filterable: true },
      barcode: { type: "string", searchable: true, sortable: true, filterable: true },
      status: { type: "string", sortable: true, filterable: true },
      condition: { type: "string", sortable: true, filterable: true },
      inventoryItemId: { type: "string", filterable: true },
      locationId: { type: "string", filterable: true },
      currentHolderId: { type: "string", filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["uniqueCode", "serialNumber", "barcode", "notes"])
    .filter()
    .sort()
    .paginate()
    .include({
      inventoryItem: true,
      location: {
        include: {
          room: true,
        },
      },
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const getUnitById = async (id: string) => {
  const unit = await prisma.inventoryUnit.findUnique({
    where: { id },
    include: {
      inventoryItem: {
        include: {
          category: true,
        },
      },
      location: {
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
        },
      },
      movements: {
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          fromLocation: true,
          toLocation: true,
        },
      },
    },
  });

  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, "Inventory unit not found!");
  }

  let currentHolder = null;
  if (unit.currentHolderId) {
    currentHolder = await prisma.user.findUnique({
      where: { id: unit.currentHolderId },
      select: {
        id: true,
        employeeId: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
  }

  return {
    ...unit,
    currentHolder,
  };
};

const updateUnit = async (
  id: string,
  payload: IUpdateInventoryUnitPayload,
  actorId?: string
) => {
  const before = await getUnitById(id);

  if (payload.locationId && payload.locationId !== before.locationId) {
    const loc = await prisma.stockLocation.findUnique({ where: { id: payload.locationId } });
    if (!loc) throw new ApiError(httpStatus.BAD_REQUEST, "Specified stock location does not exist!");
  }

  const updated = await prisma.inventoryUnit.update({
    where: { id },
    data: {
      serialNumber: payload.serialNumber,
      barcode: payload.barcode,
      condition: payload.condition as ConditionStatus | undefined,
      locationId: payload.locationId,
      notes: payload.notes,
      warrantyEndDate: payload.warrantyEndDate ? new Date(payload.warrantyEndDate) : undefined,
    },
    include: {
      inventoryItem: true,
      location: true,
    },
  });

  await AuditService.logUpdate({
    module: "InventoryUnit",
    entityType: "InventoryUnit",
    entityId: id,
    actorId,
    beforeData: before as any,
    afterData: updated as any,
  });

  return updated;
};

export const InventoryUnitService = {
  createUnit,
  batchCreateUnits,
  lookupByCodeOrQr,
  getAllUnits,
  getUnitById,
  updateUnit,
};
