import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../helpers/queryBuilder";
import prisma from "../../../shared/prisma";
import { generateSequentialCode } from "../../../helpers/sequenceGenerator";
import { uploadToCloudinary } from "../../../helpers/cloudinary";
import { StockMovementType } from "@prisma/client";
import {
  IAdjustStockPayload,
  IReleaseReservationPayload,
  IReserveStockPayload,
  IStockInPayload,
  IStockOutPayload,
  ITransferStockPayload,
} from "./stock.interface";
import { StockUtils } from "./stock.utils";

// ════════════════════════════════════════════════════════════
// 1. STOCK IN (PURCHASE / INTAKE)
// ════════════════════════════════════════════════════════════

const stockIn = async (
  payload: IStockInPayload,
  file?: Express.Multer.File,
  actorId?: string
) => {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: payload.inventoryItemId },
  });
  if (!item) throw new ApiError(httpStatus.BAD_REQUEST, "Inventory item does not exist!");

  const location = await prisma.stockLocation.findUnique({
    where: { id: payload.locationId },
  });
  if (!location) throw new ApiError(httpStatus.BAD_REQUEST, "Stock location does not exist!");

  // Update or create stock balance for bulk
  const balance = await prisma.stockBalance.upsert({
    where: {
      inventoryItemId_locationId: {
        inventoryItemId: item.id,
        locationId: location.id,
      },
    },
    update: {
      quantity: { increment: payload.quantity },
      availableQuantity: { increment: payload.quantity },
    },
    create: {
      inventoryItemId: item.id,
      locationId: location.id,
      quantity: payload.quantity,
      reservedQuantity: 0,
      availableQuantity: payload.quantity,
    },
  });

  const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
  const movement = await prisma.stockMovement.create({
    data: {
      movementNumber,
      type: (payload.type as StockMovementType) || StockMovementType.STOCK_IN,
      inventoryItemId: item.id,
      quantity: payload.quantity,
      toLocationId: location.id,
      performedById: actorId!,
      notes: payload.notes,
    },
  });

  if (file) {
    const uploadRes = await uploadToCloudinary(file, "inventory/movements");
    await prisma.stockMovementPhoto.create({
      data: {
        stockMovementId: movement.id,
        imageUrl: uploadRes.imageUrl,
        imagePublicId: uploadRes.imagePublicId,
        caption: "Stock-in intake evidence photo",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "STOCK_IN",
      module: "Stock",
      entityType: "StockMovement",
      entityId: movement.id,
      metadata: {
        inventoryItemId: item.id,
        locationId: location.id,
        quantity: payload.quantity,
        newBalance: balance.quantity,
      },
    },
  });

  return { balance, movement };
};

// ════════════════════════════════════════════════════════════
// 2. STOCK OUT (SCRAP / LOSS / DISPOSAL)
// ════════════════════════════════════════════════════════════

const stockOut = async (
  payload: IStockOutPayload,
  file?: Express.Multer.File,
  actorId?: string
) => {
  const balance = await prisma.stockBalance.findUnique({
    where: {
      inventoryItemId_locationId: {
        inventoryItemId: payload.inventoryItemId,
        locationId: payload.locationId,
      },
    },
  });

  if (!balance || balance.availableQuantity < payload.quantity) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Insufficient available stock! Available: ${balance?.availableQuantity || 0}, requested: ${payload.quantity}`
    );
  }

  const updatedBalance = await prisma.stockBalance.update({
    where: { id: balance.id },
    data: {
      quantity: { decrement: payload.quantity },
      availableQuantity: { decrement: payload.quantity },
    },
  });

  const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
  const movement = await prisma.stockMovement.create({
    data: {
      movementNumber,
      type: (payload.type as StockMovementType) || StockMovementType.STOCK_OUT,
      inventoryItemId: payload.inventoryItemId,
      quantity: payload.quantity,
      fromLocationId: payload.locationId,
      performedById: actorId!,
      notes: payload.notes,
    },
  });

  if (file) {
    const uploadRes = await uploadToCloudinary(file, "inventory/movements");
    await prisma.stockMovementPhoto.create({
      data: {
        stockMovementId: movement.id,
        imageUrl: uploadRes.imageUrl,
        imagePublicId: uploadRes.imagePublicId,
        caption: "Stock-out evidence photo",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "STOCK_OUT",
      module: "Stock",
      entityType: "StockMovement",
      entityId: movement.id,
      metadata: {
        inventoryItemId: payload.inventoryItemId,
        locationId: payload.locationId,
        quantity: payload.quantity,
        newBalance: updatedBalance.quantity,
      },
    },
  });

  return { balance: updatedBalance, movement };
};

// ════════════════════════════════════════════════════════════
// 3. TRANSFER STOCK (BETWEEN LOCATIONS)
// ════════════════════════════════════════════════════════════

const transferStock = async (
  payload: ITransferStockPayload,
  file?: Express.Multer.File,
  actorId?: string
) => {
  if (payload.fromLocationId === payload.toLocationId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Source and destination locations cannot be identical!");
  }

  const fromLoc = await prisma.stockLocation.findUnique({ where: { id: payload.fromLocationId } });
  const toLoc = await prisma.stockLocation.findUnique({ where: { id: payload.toLocationId } });
  if (!fromLoc || !toLoc) throw new ApiError(httpStatus.BAD_REQUEST, "One or both locations do not exist!");

  const item = await prisma.inventoryItem.findUnique({ where: { id: payload.inventoryItemId } });
  if (!item) throw new ApiError(httpStatus.BAD_REQUEST, "Inventory item does not exist!");

  const qty = payload.quantity || 1;

  if (payload.inventoryUnitId) {
    // ── Serialized Unit Transfer ──
    const unit = await prisma.inventoryUnit.findUnique({
      where: { id: payload.inventoryUnitId },
    });

    if (!unit || unit.inventoryItemId !== item.id) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Specified serialized unit does not belong to this item!");
    }

    if (unit.locationId !== payload.fromLocationId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Unit '${unit.uniqueCode}' is not currently at the source location!`
      );
    }

    await prisma.inventoryUnit.update({
      where: { id: unit.id },
      data: {
        locationId: payload.toLocationId,
      },
    });

    const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
    const movement = await prisma.stockMovement.create({
      data: {
        movementNumber,
        type: StockMovementType.TRANSFER,
        inventoryItemId: item.id,
        inventoryUnitId: unit.id,
        quantity: 1,
        fromLocationId: payload.fromLocationId,
        toLocationId: payload.toLocationId,
        performedById: actorId!,
        notes: payload.notes || `Transferred serialized asset ${unit.uniqueCode}`,
      },
    });

    if (file) {
      const uploadRes = await uploadToCloudinary(file, "inventory/movements");
      await prisma.stockMovementPhoto.create({
        data: {
          stockMovementId: movement.id,
          imageUrl: uploadRes.imageUrl,
          imagePublicId: uploadRes.imagePublicId,
          caption: "Transfer evidence photo",
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId,
        action: "TRANSFER",
        module: "Stock",
        entityType: "InventoryUnit",
        entityId: unit.id,
        metadata: { fromLocationId: payload.fromLocationId, toLocationId: payload.toLocationId },
      },
    });

    return { movement, unit };
  } else {
    // ── Bulk Stock Transfer ──
    const fromBalance = await prisma.stockBalance.findUnique({
      where: {
        inventoryItemId_locationId: {
          inventoryItemId: item.id,
          locationId: payload.fromLocationId,
        },
      },
    });

    if (!fromBalance || fromBalance.availableQuantity < qty) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Insufficient available stock at source location! Available: ${fromBalance?.availableQuantity || 0}, requested: ${qty}`
      );
    }

    // Decrement source
    const updatedFrom = await prisma.stockBalance.update({
      where: { id: fromBalance.id },
      data: {
        quantity: { decrement: qty },
        availableQuantity: { decrement: qty },
      },
    });

    // Increment destination
    const updatedTo = await prisma.stockBalance.upsert({
      where: {
        inventoryItemId_locationId: {
          inventoryItemId: item.id,
          locationId: payload.toLocationId,
        },
      },
      update: {
        quantity: { increment: qty },
        availableQuantity: { increment: qty },
      },
      create: {
        inventoryItemId: item.id,
        locationId: payload.toLocationId,
        quantity: qty,
        reservedQuantity: 0,
        availableQuantity: qty,
      },
    });

    const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
    const movement = await prisma.stockMovement.create({
      data: {
        movementNumber,
        type: StockMovementType.TRANSFER,
        inventoryItemId: item.id,
        quantity: qty,
        fromLocationId: payload.fromLocationId,
        toLocationId: payload.toLocationId,
        performedById: actorId!,
        notes: payload.notes || "Bulk stock transfer between locations",
      },
    });

    if (file) {
      const uploadRes = await uploadToCloudinary(file, "inventory/movements");
      await prisma.stockMovementPhoto.create({
        data: {
          stockMovementId: movement.id,
          imageUrl: uploadRes.imageUrl,
          imagePublicId: uploadRes.imagePublicId,
          caption: "Bulk transfer evidence photo",
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId,
        action: "TRANSFER",
        module: "Stock",
        entityType: "StockMovement",
        entityId: movement.id,
        metadata: {
          fromLocationId: payload.fromLocationId,
          toLocationId: payload.toLocationId,
          quantity: qty,
        },
      },
    });

    return { movement, fromBalance: updatedFrom, toBalance: updatedTo };
  }
};

// ════════════════════════════════════════════════════════════
// 4. ADJUST STOCK (INVENTORY RECONCILIATION)
// ════════════════════════════════════════════════════════════

const adjustStock = async (
  payload: IAdjustStockPayload,
  file?: Express.Multer.File,
  actorId?: string
) => {
  const balance = await prisma.stockBalance.upsert({
    where: {
      inventoryItemId_locationId: {
        inventoryItemId: payload.inventoryItemId,
        locationId: payload.locationId,
      },
    },
    update: {},
    create: {
      inventoryItemId: payload.inventoryItemId,
      locationId: payload.locationId,
      quantity: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
    },
  });

  const oldQuantity = balance.quantity;
  const diff = payload.newQuantity - oldQuantity;

  if (payload.newQuantity < balance.reservedQuantity) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `New quantity (${payload.newQuantity}) cannot be lower than currently reserved stock (${balance.reservedQuantity})!`
    );
  }

  const newAvailable = payload.newQuantity - balance.reservedQuantity;

  const updatedBalance = await prisma.stockBalance.update({
    where: { id: balance.id },
    data: {
      quantity: payload.newQuantity,
      availableQuantity: newAvailable,
    },
  });

  const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
  const movement = await prisma.stockMovement.create({
    data: {
      movementNumber,
      type: StockMovementType.ADJUSTMENT,
      inventoryItemId: payload.inventoryItemId,
      quantity: Math.abs(diff),
      toLocationId: diff >= 0 ? payload.locationId : undefined,
      fromLocationId: diff < 0 ? payload.locationId : undefined,
      performedById: actorId!,
      notes: `Stock adjustment (${diff >= 0 ? "+" : ""}${diff}): ${payload.notes}`,
    },
  });

  if (file) {
    const uploadRes = await uploadToCloudinary(file, "inventory/movements");
    await prisma.stockMovementPhoto.create({
      data: {
        stockMovementId: movement.id,
        imageUrl: uploadRes.imageUrl,
        imagePublicId: uploadRes.imagePublicId,
        caption: "Adjustment reconciliation evidence",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "ADJUST",
      module: "Stock",
      entityType: "StockBalance",
      entityId: balance.id,
      beforeData: balance as any,
      afterData: updatedBalance as any,
      metadata: { oldQuantity, newQuantity: payload.newQuantity, diff, reason: payload.notes },
    },
  });

  return { balance: updatedBalance, movement };
};

// ════════════════════════════════════════════════════════════
// 5. RESERVATION & RELEASE
// ════════════════════════════════════════════════════════════

const reserveStock = async (
  payload: IReserveStockPayload,
  actorId?: string
) => {
  const balance = await prisma.stockBalance.findUnique({
    where: {
      inventoryItemId_locationId: {
        inventoryItemId: payload.inventoryItemId,
        locationId: payload.locationId,
      },
    },
  });

  if (!balance || balance.availableQuantity < payload.quantity) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot reserve: insufficient available quantity (${balance?.availableQuantity || 0} available, ${payload.quantity} requested)`
    );
  }

  const updatedBalance = await prisma.stockBalance.update({
    where: { id: balance.id },
    data: {
      reservedQuantity: { increment: payload.quantity },
      availableQuantity: { decrement: payload.quantity },
    },
  });

  const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
  const movement = await prisma.stockMovement.create({
    data: {
      movementNumber,
      type: StockMovementType.RESERVATION,
      inventoryItemId: payload.inventoryItemId,
      quantity: payload.quantity,
      fromLocationId: payload.locationId,
      performedById: actorId!,
      referenceType: payload.referenceType,
      referenceId: StockUtils.toValidObjectId(payload.referenceId),
      notes: StockUtils.formatReferenceNote(
        `Stock reserved (${payload.quantity})`,
        payload.referenceId
      ),
    },
  });

  return { balance: updatedBalance, movement };
};

const releaseReservation = async (
  payload: IReleaseReservationPayload,
  actorId?: string
) => {
  const balance = await prisma.stockBalance.findUnique({
    where: {
      inventoryItemId_locationId: {
        inventoryItemId: payload.inventoryItemId,
        locationId: payload.locationId,
      },
    },
  });

  if (!balance || balance.reservedQuantity < payload.quantity) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot release reservation: requested ${payload.quantity} exceeds reserved quantity of ${balance?.reservedQuantity || 0}`
    );
  }

  const updatedBalance = await prisma.stockBalance.update({
    where: { id: balance.id },
    data: {
      reservedQuantity: { decrement: payload.quantity },
      availableQuantity: { increment: payload.quantity },
    },
  });

  const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
  const movement = await prisma.stockMovement.create({
    data: {
      movementNumber,
      type: StockMovementType.RESERVATION_RELEASE,
      inventoryItemId: payload.inventoryItemId,
      quantity: payload.quantity,
      toLocationId: payload.locationId,
      performedById: actorId!,
      referenceType: payload.referenceType,
      referenceId: StockUtils.toValidObjectId(payload.referenceId),
      notes: StockUtils.formatReferenceNote(
        `Stock reservation released (${payload.quantity})`,
        payload.referenceId
      ),
    },
  });

  return { balance: updatedBalance, movement };
};

// ════════════════════════════════════════════════════════════
// 6. QUERIES
// ════════════════════════════════════════════════════════════

const getAllStockBalances = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.stockBalance as any, query, {
    fields: {
      inventoryItemId: { type: "string", filterable: true },
      locationId: { type: "string", filterable: true },
      quantity: { type: "number", sortable: true, filterable: true },
      reservedQuantity: { type: "number", sortable: true, filterable: true },
      availableQuantity: { type: "number", sortable: true, filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .filter()
    .sort()
    .paginate()
    .include({
      inventoryItem: {
        include: {
          category: true,
        },
      },
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

const getAllStockMovements = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.stockMovement as any, query, {
    fields: {
      movementNumber: { type: "string", searchable: true, sortable: true, filterable: true },
      type: { type: "string", sortable: true, filterable: true },
      inventoryItemId: { type: "string", filterable: true },
      inventoryUnitId: { type: "string", filterable: true },
      fromLocationId: { type: "string", filterable: true },
      toLocationId: { type: "string", filterable: true },
      performedById: { type: "string", filterable: true },
      referenceType: { type: "string", filterable: true },
      referenceId: { type: "string", filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["movementNumber", "notes"])
    .filter()
    .sort()
    .paginate()
    .include({
      inventoryItem: true,
      inventoryUnit: true,
      fromLocation: true,
      toLocation: true,
      photos: true,
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

export const StockService = {
  stockIn,
  stockOut,
  transferStock,
  adjustStock,
  reserveStock,
  releaseReservation,
  getAllStockBalances,
  getAllStockMovements,
};
