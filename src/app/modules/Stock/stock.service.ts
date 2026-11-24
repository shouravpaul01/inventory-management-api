import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../helpers/queryBuilder";
import prisma from "../../../shared/prisma";
import { generateSequentialCode } from "../../../helpers/sequenceGenerator";
import { uploadToCloudinary } from "../../../helpers/cloudinary";
import { ConditionStatus, InventoryUnitStatus, StockMovementType, AuditAction } from "@prisma/client";
import {
  IAdjustStockPayload,
  IReleaseReservationPayload,
  IReserveStockPayload,
  IStockInPayload,
  IStockOutPayload,
  ITransferStockPayload,
} from "./stock.interface";
import { StockUtils } from "./stock.utils";
import { NotificationService } from "../Notification/notification.service";
import { AuditService } from "../Audit/audit.service";
import { generateQrValue, getAssetPrefix } from "../InventoryUnit/inventoryUnit.utils";

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

  const isSerialized = item.trackingType === "SERIALIZED" || item.isReturnable;
  const intakeQty =
    payload.units && payload.units.length > 0 ? payload.units.length : payload.quantity;

  if (isSerialized) {
    // ── Serialized / Returnable Asset Intake ──
    const prefix = getAssetPrefix(item.code);
    const createdUnits = [];
    const createdMovements = [];

    for (let i = 0; i < intakeQty; i++) {
      const unitData = payload.units?.[i];
      let uniqueCode = unitData?.uniqueCode?.trim().toUpperCase();

      if (!uniqueCode) {
        uniqueCode = await generateSequentialCode(`${prefix}_UNIT_SEQ`, prefix);
      } else {
        const existing = await prisma.inventoryUnit.findUnique({ where: { uniqueCode } });
        if (existing) {
          throw new ApiError(httpStatus.CONFLICT, `Asset code '${uniqueCode}' already exists!`);
        }
      }

      const qrValue = generateQrValue(uniqueCode);
      const condition = (unitData?.condition as ConditionStatus) || ConditionStatus.NEW;

      const unit = await prisma.inventoryUnit.create({
        data: {
          inventoryItemId: item.id,
          uniqueCode,
          serialNumber: unitData?.serialNumber?.trim() || null,
          qrValue,
          condition,
          status: InventoryUnitStatus.IN_STOCK,
          locationId: location.id,
          purchaseDate: unitData?.purchaseDate ? new Date(unitData.purchaseDate) : new Date(),
          warrantyEndDate: unitData?.warrantyEndDate ? new Date(unitData.warrantyEndDate) : null,
          notes: unitData?.notes || payload.notes,
        },
      });

      const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
      const movement = await prisma.stockMovement.create({
        data: {
          movementNumber,
          type: (payload.type as StockMovementType) || StockMovementType.STOCK_IN,
          inventoryItemId: item.id,
          inventoryUnitId: unit.id,
          quantity: 1,
          toLocationId: location.id,
          performedById: actorId!,
          notes: payload.notes || `Stock intake for serialized unit ${unit.uniqueCode}`,
        },
      });

      createdUnits.push(unit);
      createdMovements.push(movement);
    }

    // Upsert bulk stock balance to match physical units count
    const balance = await prisma.stockBalance.upsert({
      where: {
        inventoryItemId_locationId: {
          inventoryItemId: item.id,
          locationId: location.id,
        },
      },
      update: {
        quantity: { increment: intakeQty },
        availableQuantity: { increment: intakeQty },
      },
      create: {
        inventoryItemId: item.id,
        locationId: location.id,
        quantity: intakeQty,
        reservedQuantity: 0,
        availableQuantity: intakeQty,
      },
    });

    if (file && createdMovements.length > 0) {
      const uploadRes = await uploadToCloudinary(file, "inventory/movements");
      await prisma.stockMovementPhoto.create({
        data: {
          stockMovementId: createdMovements[0].id,
          imageUrl: uploadRes.imageUrl,
          imagePublicId: uploadRes.imagePublicId,
          caption: "Stock-in intake evidence photo",
        },
      });
    }

    await AuditService.logAction(AuditAction.STOCK_IN, {
      module: "Stock",
      entityType: "StockBalance",
      entityId: balance.id,
      actorId,
      metadata: {
        inventoryItemId: item.id,
        locationId: location.id,
        quantity: intakeQty,
        isSerialized: true,
        unitCodes: createdUnits.map((u) => u.uniqueCode),
      },
    });

    return { balance, units: createdUnits, movements: createdMovements };
  } else {
    // ── Bulk Consumable Stock Intake ──
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

    await AuditService.logAction(AuditAction.STOCK_IN, {
      module: "Stock",
      entityType: "StockMovement",
      entityId: movement.id,
      actorId,
      metadata: {
        inventoryItemId: item.id,
        locationId: location.id,
        quantity: payload.quantity,
        newBalance: balance.quantity,
      },
    });

    return { balance, movement };
  }
};

// ════════════════════════════════════════════════════════════
// 2. STOCK OUT (SCRAP / LOSS / DISPOSAL)
// ════════════════════════════════════════════════════════════

const stockOut = async (
  payload: IStockOutPayload,
  file?: Express.Multer.File,
  actorId?: string
) => {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: payload.inventoryItemId },
  });
  if (!item) throw new ApiError(httpStatus.BAD_REQUEST, "Inventory item does not exist!");

  const balance = await prisma.stockBalance.findUnique({
    where: {
      inventoryItemId_locationId: {
        inventoryItemId: payload.inventoryItemId,
        locationId: payload.locationId,
      },
    },
  });

  const isSerialized = item.trackingType === "SERIALIZED" || item.isReturnable;
  const targetUnitIds = (payload.unitIds || []).filter(Boolean);

  if (isSerialized && targetUnitIds.length === 0) {
    const unitCount = await prisma.inventoryUnit.count({
      where: {
        inventoryItemId: item.id,
        locationId: payload.locationId,
        status: InventoryUnitStatus.IN_STOCK,
      },
    });
    if (unitCount > 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Item '${item.name}' is serialized/returnable. Please select the specific unit(s) to write off.`
      );
    }
  }

  if (targetUnitIds.length > 0) {
    // ── Serialized Unit Write-Off ──
    const units = await prisma.inventoryUnit.findMany({
      where: { id: { in: targetUnitIds } },
    });

    if (units.length !== targetUnitIds.length) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "One or more selected serialized units were not found!"
      );
    }

    for (const u of units) {
      if (u.inventoryItemId !== item.id) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Unit '${u.uniqueCode}' does not belong to item '${item.name}'!`
        );
      }
      if (u.locationId !== payload.locationId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Unit '${u.uniqueCode}' is not currently at the specified location!`
        );
      }
      if (u.status !== InventoryUnitStatus.IN_STOCK) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Unit '${u.uniqueCode}' is not active in stock (current status: ${u.status})!`
        );
      }
    }

    const deductQty = units.length;
    if (!balance || balance.availableQuantity < deductQty) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Insufficient available stock balance! Available: ${balance?.availableQuantity || 0}, requested: ${deductQty}`
      );
    }

    let targetStatus: InventoryUnitStatus = InventoryUnitStatus.DISPOSED;
    if (payload.type === "DAMAGE") targetStatus = InventoryUnitStatus.DAMAGED;
    else if (payload.type === "LOSS") targetStatus = InventoryUnitStatus.LOST;
    else if (payload.type === "GIFT") targetStatus = InventoryUnitStatus.GIFTED;
    else if (payload.type === "DISPOSAL") targetStatus = InventoryUnitStatus.DISPOSED;

    for (const u of units) {
      await prisma.inventoryUnit.update({
        where: { id: u.id },
        data: {
          status: targetStatus,
          notes: payload.notes
            ? `${u.notes ? u.notes + " | " : ""}${payload.type}: ${payload.notes}`
            : u.notes,
        },
      });
    }

    const updatedBalance = await prisma.stockBalance.update({
      where: { id: balance.id },
      data: {
        quantity: { decrement: deductQty },
        availableQuantity: { decrement: deductQty },
      },
    });

    const movements = [];
    for (const u of units) {
      const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
      const movement = await prisma.stockMovement.create({
        data: {
          movementNumber,
          type: (payload.type as StockMovementType) || StockMovementType.STOCK_OUT,
          inventoryItemId: payload.inventoryItemId,
          inventoryUnitId: u.id,
          quantity: 1,
          fromLocationId: payload.locationId,
          performedById: actorId!,
          notes:
            payload.notes ||
            `Serialized asset ${u.uniqueCode} write-off (${payload.type || "STOCK_OUT"})`,
        },
      });
      movements.push(movement);
    }

    if (file && movements.length > 0) {
      const uploadRes = await uploadToCloudinary(file, "inventory/movements");
      await prisma.stockMovementPhoto.create({
        data: {
          stockMovementId: movements[0].id,
          imageUrl: uploadRes.imageUrl,
          imagePublicId: uploadRes.imagePublicId,
          caption: "Stock-out evidence photo",
        },
      });
    }

    await AuditService.logAction(AuditAction.STOCK_OUT, {
      module: "Stock",
      entityType: "StockMovement",
      entityId: movements[0]?.id || balance.id,
      actorId,
      metadata: {
        inventoryItemId: payload.inventoryItemId,
        locationId: payload.locationId,
        quantity: deductQty,
        unitCodes: units.map((u) => u.uniqueCode),
        targetStatus,
        newBalance: updatedBalance.quantity,
      },
    });

    return { balance: updatedBalance, units, movements };
  } else {
    // ── Bulk Stock Out ──
    const qty = payload.quantity || 1;
    if (!balance || balance.availableQuantity < qty) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Insufficient available stock! Available: ${balance?.availableQuantity || 0}, requested: ${qty}`
      );
    }

    const updatedBalance = await prisma.stockBalance.update({
      where: { id: balance.id },
      data: {
        quantity: { decrement: qty },
        availableQuantity: { decrement: qty },
      },
    });

    const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
    const movement = await prisma.stockMovement.create({
      data: {
        movementNumber,
        type: (payload.type as StockMovementType) || StockMovementType.STOCK_OUT,
        inventoryItemId: payload.inventoryItemId,
        quantity: qty,
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

    await AuditService.logAction(AuditAction.STOCK_OUT, {
      module: "Stock",
      entityType: "StockMovement",
      entityId: movement.id,
      actorId,
      metadata: {
        inventoryItemId: payload.inventoryItemId,
        locationId: payload.locationId,
        quantity: qty,
        newBalance: updatedBalance.quantity,
      },
    });

    return { balance: updatedBalance, movement };
  }
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
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Source and destination locations cannot be identical!"
    );
  }

  const fromLoc = await prisma.stockLocation.findUnique({
    where: { id: payload.fromLocationId },
  });
  const toLoc = await prisma.stockLocation.findUnique({
    where: { id: payload.toLocationId },
  });
  if (!fromLoc || !toLoc)
    throw new ApiError(httpStatus.BAD_REQUEST, "One or both locations do not exist!");

  const item = await prisma.inventoryItem.findUnique({
    where: { id: payload.inventoryItemId },
  });
  if (!item) throw new ApiError(httpStatus.BAD_REQUEST, "Inventory item does not exist!");

  const targetUnitIds = (
    payload.unitIds && payload.unitIds.length > 0
      ? payload.unitIds
      : payload.inventoryUnitId
      ? [payload.inventoryUnitId]
      : []
  ).filter(Boolean);

  const isSerialized = item.trackingType === "SERIALIZED" || item.isReturnable;

  if (isSerialized && targetUnitIds.length === 0) {
    const unitCount = await prisma.inventoryUnit.count({
      where: {
        inventoryItemId: item.id,
        locationId: payload.fromLocationId,
        status: InventoryUnitStatus.IN_STOCK,
      },
    });
    if (unitCount > 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Item '${item.name}' is serialized/returnable. Please select the specific unit(s) to transfer.`
      );
    }
  }

  if (targetUnitIds.length > 0) {
    // ── Serialized Unit(s) Transfer ──
    const units = await prisma.inventoryUnit.findMany({
      where: { id: { in: targetUnitIds } },
    });

    if (units.length !== targetUnitIds.length) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "One or more serialized units were not found!"
      );
    }

    for (const unit of units) {
      if (unit.inventoryItemId !== item.id) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Unit '${unit.uniqueCode}' does not belong to item '${item.name}'!`
        );
      }
      if (unit.locationId !== payload.fromLocationId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Unit '${unit.uniqueCode}' is not currently at the source location!`
        );
      }
      if (unit.status !== InventoryUnitStatus.IN_STOCK) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Unit '${unit.uniqueCode}' cannot be transferred because its status is ${unit.status}!`
        );
      }
    }

    const qty = units.length;

    // Check source balance
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

    // Decrement source balance
    const updatedFrom = await prisma.stockBalance.update({
      where: { id: fromBalance.id },
      data: {
        quantity: { decrement: qty },
        availableQuantity: { decrement: qty },
      },
    });

    // Increment destination balance
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

    // Relocate units to destination
    await prisma.inventoryUnit.updateMany({
      where: { id: { in: targetUnitIds } },
      data: {
        locationId: payload.toLocationId,
      },
    });

    // Record individual stock movement for each unit
    const movements = [];
    for (const unit of units) {
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
      movements.push(movement);
    }

    if (file && movements.length > 0) {
      const uploadRes = await uploadToCloudinary(file, "inventory/movements");
      await prisma.stockMovementPhoto.create({
        data: {
          stockMovementId: movements[0].id,
          imageUrl: uploadRes.imageUrl,
          imagePublicId: uploadRes.imagePublicId,
          caption: "Transfer evidence photo",
        },
      });
    }

    await AuditService.logAction(AuditAction.TRANSFER, {
      module: "Stock",
      entityType: "StockMovement",
      entityId: movements[0]?.id || item.id,
      actorId,
      metadata: {
        fromLocationId: payload.fromLocationId,
        toLocationId: payload.toLocationId,
        quantity: qty,
        unitCodes: units.map((u) => u.uniqueCode),
      },
    });

    return { movements, units, fromBalance: updatedFrom, toBalance: updatedTo };
  } else {
    // ── Bulk Stock Transfer ──
    const qty = payload.quantity || 1;

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

    await AuditService.logAction(AuditAction.TRANSFER, {
      module: "Stock",
      entityType: "StockMovement",
      entityId: movement.id,
      actorId,
      metadata: {
        fromLocationId: payload.fromLocationId,
        toLocationId: payload.toLocationId,
        quantity: qty,
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

  await AuditService.logAction(AuditAction.ADJUST, {
    module: "Stock",
    entityType: "StockBalance",
    entityId: balance.id,
    actorId,
    beforeData: balance as any,
    afterData: updatedBalance as any,
    metadata: { oldQuantity, newQuantity: payload.newQuantity, diff, reason: payload.notes },
  });

  // Real-time Alert for downward adjustment or zero stock
  if (diff < 0 || newAvailable <= 0) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: payload.inventoryItemId },
      select: { name: true, code: true },
    });
    await NotificationService.notifyRole({
      roleCode: "STORE_OFFICER",
      type: "STOCK",
      title: "Stock Adjustment Alert",
      message: `Stock for '${item?.name || payload.inventoryItemId}' was adjusted downward by ${Math.abs(diff)} units (Available: ${newAvailable}). Reason: ${payload.notes}`,
      referenceType: "StockBalance",
      referenceId: balance.id,
    });
  }

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
