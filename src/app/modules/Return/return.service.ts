import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../helpers/queryBuilder";
import { generateSequentialCode } from "../../../helpers/sequenceGenerator";
import { uploadToCloudinary } from "../../../helpers/cloudinary";
import { IAuthUser } from "../../../interfaces";
import {
  AuditAction,
  ConditionStatus,
  InventoryUnitStatus,
  ReturnCondition,
  ReturnStatus,
  StockMovementType,
  StockTrackingType,
} from "@prisma/client";
import { IProcessReturnPayload } from "./return.interface";
import { ReturnUtils } from "./return.utils";
import { NotificationService } from "../Notification/notification.service";

const processReturn = async (
  payload: IProcessReturnPayload,
  file?: Express.Multer.File,
  processor?: IAuthUser
) => {
  // 1. Verify Distribution exists
  const distribution = await prisma.distribution.findUnique({
    where: { id: payload.distributionId },
    include: { lines: true, requisition: true },
  });

  if (!distribution) {
    throw new ApiError(httpStatus.NOT_FOUND, "Distribution record not found!");
  }

  // 2. Pre-validate returnability and locations for each line
  for (const line of payload.lines) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: line.inventoryItemId },
    });

    if (!item) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Inventory item '${line.inventoryItemId}' not found!`);
    }

    if (!item.isReturnable) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Item '${item.name}' is marked non-returnable and cannot be returned into inventory!`
      );
    }

    const destLocation = await prisma.stockLocation.findUnique({
      where: { id: line.destinationLocationId },
    });

    if (!destLocation) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Destination stock location '${line.destinationLocationId}' not found!`
      );
    }

    if (item.trackingType === StockTrackingType.SERIALIZED && line.inventoryUnitId) {
      const unit = await prisma.inventoryUnit.findUnique({
        where: { id: line.inventoryUnitId },
      });

      if (!unit) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Serialized unit '${line.inventoryUnitId}' not found!`
        );
      }
    }
  }

  const locationQtyMap = ReturnUtils.aggregateReturnLocations(payload.lines);

  // 3. Generate Return Number and Create ReturnTransaction
  const returnNumber = await generateSequentialCode("RET_SEQ", "RET");

  const returnTransaction = await prisma.returnTransaction.create({
    data: {
      returnNumber,
      distributionId: distribution.id,
      processedById: processor?.id || distribution.issuedById,
      status: (payload.status as ReturnStatus) || ReturnStatus.RETURNED,
      returnedAt: new Date(),
      remarks: payload.remarks,
      lines: {
        create: payload.lines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          inventoryUnitId: l.inventoryUnitId,
          quantity: l.quantity,
          condition: (l.condition as ReturnCondition) || ReturnCondition.GOOD,
          remarks: l.remarks,
        })),
      },
      locations: {
        create: (payload.locationSplits && payload.locationSplits.length > 0
          ? payload.locationSplits
          : Object.entries(locationQtyMap).map(([locationId, quantity]) => ({
              locationId,
              quantity,
            }))
        ).map((loc) => ({
          locationId: loc.locationId,
          quantity: loc.quantity,
        })),
      },
    },
    include: {
      lines: true,
      locations: true,
    },
  });

  // 4. Update Stock & Asset states for each returned line
  for (const line of payload.lines) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: line.inventoryItemId },
    });

    if (item?.trackingType === StockTrackingType.SERIALIZED && line.inventoryUnitId) {
      const { unitStatus, unitCondition } =
        ReturnUtils.mapReturnConditionToUnitState(line.condition);

      await prisma.inventoryUnit.update({
        where: { id: line.inventoryUnitId },
        data: {
          status: unitStatus,
          condition: unitCondition,
          locationId: line.condition !== "LOST" ? line.destinationLocationId : null,
          currentHolderId: null, // Holder cleared
        },
      });

      const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
      const movement = await prisma.stockMovement.create({
        data: {
          movementNumber,
          type: StockMovementType.RETURN,
          inventoryItemId: item.id,
          inventoryUnitId: line.inventoryUnitId,
          quantity: 1,
          toLocationId: line.destinationLocationId,
          performedById: processor?.id || distribution.issuedById,
          referenceType: "RETURN",
          referenceId: returnTransaction.id,
          notes: `Asset returned from distribution (${distribution.distributionNo}) in ${line.condition} condition`,
        },
      });

      if (file) {
        const uploadRes = await uploadToCloudinary(file, "inventory/returns");
        await prisma.stockMovementPhoto.create({
          data: {
            stockMovementId: movement.id,
            imageUrl: uploadRes.imageUrl,
            imagePublicId: uploadRes.imagePublicId,
            caption: `Return inspection photo for unit`,
          },
        });
      }
    } else if (item) {
      // BULK restock balance
      await prisma.stockBalance.upsert({
        where: {
          inventoryItemId_locationId: {
            inventoryItemId: item.id,
            locationId: line.destinationLocationId,
          },
        },
        update: {
          quantity: { increment: line.quantity },
          availableQuantity: { increment: line.quantity },
        },
        create: {
          inventoryItemId: item.id,
          locationId: line.destinationLocationId,
          quantity: line.quantity,
          reservedQuantity: 0,
          availableQuantity: line.quantity,
        },
      });

      const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
      const movement = await prisma.stockMovement.create({
        data: {
          movementNumber,
          type: StockMovementType.RETURN,
          inventoryItemId: item.id,
          quantity: line.quantity,
          toLocationId: line.destinationLocationId,
          performedById: processor?.id || distribution.issuedById,
          referenceType: "RETURN",
          referenceId: returnTransaction.id,
          notes: `Bulk returned (${line.quantity} units) from distribution (${distribution.distributionNo})`,
        },
      });

      if (file) {
        const uploadRes = await uploadToCloudinary(file, "inventory/returns");
        await prisma.stockMovementPhoto.create({
          data: {
            stockMovementId: movement.id,
            imageUrl: uploadRes.imageUrl,
            imagePublicId: uploadRes.imagePublicId,
            caption: `Return bulk evidence photo`,
          },
        });
      }
    }

    // Update RequisitionLine returnedQty if requisition line exists
    const matchingDistLine = distribution.lines.find(
      (dl) => dl.inventoryItemId === line.inventoryItemId
    );
    if (matchingDistLine?.requisitionLineId) {
      await prisma.requisitionLine.update({
        where: { id: matchingDistLine.requisitionLineId },
        data: {
          returnedQty: { increment: line.quantity },
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      actorId: processor?.id,
      action: AuditAction.RETURN,
      module: "Return",
      entityType: "ReturnTransaction",
      entityId: returnTransaction.id,
      metadata: {
        returnNumber: returnTransaction.returnNumber,
        distributionId: distribution.id,
        lineCount: payload.lines.length,
      },
    },
  });

  // Real-time Notification to returner
  await NotificationService.createNotification({
    userId: distribution.receiverId,
    type: "RETURN",
    title: "Return Processed",
    message: `Return transaction '${returnTransaction.returnNumber}' for distribution '${distribution.distributionNo}' has been processed into inventory.`,
    referenceType: "ReturnTransaction",
    referenceId: returnTransaction.id,
  });

  // Real-time Alert to managers if any item was damaged or lost
  const damagedOrLost = payload.lines.filter((l) =>
    ["DAMAGED", "LOST", "NEEDS_REPAIR"].includes(l.condition)
  );
  if (damagedOrLost.length > 0) {
    await NotificationService.notifyRole({
      roleCode: "INVENTORY_MANAGER",
      type: "ALERT",
      title: "Return Condition Alert",
      message: `Return '${returnTransaction.returnNumber}' reported ${damagedOrLost.length} item(s) in DAMAGED/LOST condition!`,
      referenceType: "ReturnTransaction",
      referenceId: returnTransaction.id,
    });
  }

  return getReturnById(returnTransaction.id);
};

// ════════════════════════════════════════════════════════════
// 2. QUERIES
// ════════════════════════════════════════════════════════════

const getReturnById = async (id: string) => {
  const returnTransaction = await prisma.returnTransaction.findUnique({
    where: { id },
    include: {
      distribution: {
        include: {
          requisition: true,
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              email: true,
            },
          },
        },
      },
      processedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          email: true,
        },
      },
      lines: {
        include: {
          inventoryItem: true,
          inventoryUnit: true,
        },
      },
      locations: {
        include: {
          location: true,
        },
      },
    },
  });

  if (!returnTransaction) {
    throw new ApiError(httpStatus.NOT_FOUND, "Return transaction record not found!");
  }

  return returnTransaction;
};

const getAllReturns = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.returnTransaction as any, query, {
    fields: {
      returnNumber: { type: "string", searchable: true, sortable: true, filterable: true },
      distributionId: { type: "string", filterable: true },
      processedById: { type: "string", filterable: true },
      status: { type: "string", sortable: true, filterable: true },
      returnedAt: { type: "date", sortable: true, filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["returnNumber", "remarks"])
    .filter()
    .sort()
    .paginate()
    .include({
      distribution: true,
      processedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
        },
      },
      lines: {
        include: {
          inventoryItem: true,
          inventoryUnit: true,
        },
      },
      locations: {
        include: {
          location: true,
        },
      },
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

export const ReturnService = {
  processReturn,
  getReturnById,
  getAllReturns,
};
