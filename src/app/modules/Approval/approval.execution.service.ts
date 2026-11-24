import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import {
  ApprovalEntityType,
  ApprovalRequest,
  AuditAction,
  RequestStatus,
  RequestLineStatus,
  StockMovementType,
} from "@prisma/client";
import { generateSequentialCode } from "../../../helpers/sequenceGenerator";
import { AuditService } from "../Audit/audit.service";
import { NotificationService } from "../Notification/notification.service";

/**
 * Universal Approval Execution Engine
 *
 * Executes staged mutation requests when Super Admin approves an ApprovalRequest.
 */
export const executeApprovedRequest = async (
  request: ApprovalRequest
): Promise<any> => {
  const metadata = (request.metadata || {}) as Record<string, any>;
  const action = metadata.action || "CREATE";
  const payload = metadata.payload || {};
  const entityId = request.entityId !== "NEW" && request.entityId !== "PENDING_CREATION" ? request.entityId : metadata.entityId;
  const actorId = request.requestedById;

  let executionResult: any = null;

  switch (request.entityType) {
    // ─────────────────────────────────────────────────────────────
    // 1. INVENTORY ITEM (CATALOG MASTER)
    // ─────────────────────────────────────────────────────────────
    case ApprovalEntityType.INVENTORY_ITEM: {
      if (action === "CREATE") {
        let itemCode = payload.code;
        if (!itemCode) {
          const category = await prisma.category.findUnique({ where: { id: payload.categoryId } });
          const prefix = category?.code ? category.code.toUpperCase().slice(0, 4) : "ITM";
          itemCode = await generateSequentialCode(`${prefix}_SEQ`, prefix);
        }

        executionResult = await prisma.inventoryItem.create({
          data: {
            name: payload.name,
            code: itemCode,
            sku: payload.sku,
            description: payload.description,
            categoryId: payload.categoryId,
            brand: payload.brand,
            model: payload.model,
            trackingType: payload.trackingType,
            isReturnable: payload.isReturnable ?? false,
            defaultIssuePolicy: payload.defaultIssuePolicy || "PERMANENT",
            unitName: payload.unitName || "Piece",
            minimumStock: payload.minimumStock ?? 0,
            reorderLevel: payload.reorderLevel ?? 0,
            isActive: payload.isActive ?? true,
            imageUrl: payload.imageUrl,
            imagePublicId: payload.imagePublicId,
          },
          include: { category: true },
        });

        await AuditService.logCreate({
          module: "Inventory",
          entityType: "InventoryItem",
          entityId: executionResult.id,
          actorId,
          afterData: executionResult,
        });
      } else if (action === "UPDATE") {
        if (!entityId) throw new ApiError(httpStatus.BAD_REQUEST, "Missing entityId for item update");
        executionResult = await prisma.inventoryItem.update({
          where: { id: entityId },
          data: payload,
          include: { category: true },
        });

        await AuditService.logAction(AuditAction.UPDATE, {
          module: "Inventory",
          entityType: "InventoryItem",
          entityId,
          actorId,
          afterData: executionResult,
        });
      } else if (action === "DELETE") {
        if (!entityId) throw new ApiError(httpStatus.BAD_REQUEST, "Missing entityId for item deletion");
        executionResult = await prisma.inventoryItem.delete({ where: { id: entityId } });
        await AuditService.logAction(AuditAction.DELETE, {
          module: "Inventory",
          entityType: "InventoryItem",
          entityId,
          actorId,
        });
      }
      break;
    }

    // ─────────────────────────────────────────────────────────────
    // 2. CATEGORY
    // ─────────────────────────────────────────────────────────────
    case ApprovalEntityType.CATEGORY: {
      if (action === "CREATE") {
        executionResult = await prisma.category.create({
          data: payload,
          include: { parent: true },
        });
        await AuditService.logCreate({
          module: "Category",
          entityType: "Category",
          entityId: executionResult.id,
          actorId,
          afterData: executionResult,
        });
      } else if (action === "UPDATE") {
        if (!entityId) throw new ApiError(httpStatus.BAD_REQUEST, "Missing entityId for category update");
        executionResult = await prisma.category.update({
          where: { id: entityId },
          data: payload,
          include: { parent: true },
        });
        await AuditService.logAction(AuditAction.UPDATE, {
          module: "Category",
          entityType: "Category",
          entityId,
          actorId,
          afterData: executionResult,
        });
      } else if (action === "DELETE") {
        if (!entityId) throw new ApiError(httpStatus.BAD_REQUEST, "Missing entityId for category deletion");
        executionResult = await prisma.category.delete({ where: { id: entityId } });
        await AuditService.logAction(AuditAction.DELETE, {
          module: "Category",
          entityType: "Category",
          entityId,
          actorId,
        });
      }
      break;
    }

    // ─────────────────────────────────────────────────────────────
    // 3. STOCK (ADJUSTMENT, STOCK-IN, TRANSFER)
    // ─────────────────────────────────────────────────────────────
    case ApprovalEntityType.STOCK_ADJUSTMENT:
    case ApprovalEntityType.STOCK_TRANSFER: {
      if (action === "ADJUST") {
        const balance = await prisma.stockBalance.upsert({
          where: {
            inventoryItemId_locationId: {
              inventoryItemId: payload.inventoryItemId,
              locationId: payload.locationId,
            },
          },
          update: {
            quantity: payload.actualQuantity,
            availableQuantity: payload.actualQuantity,
          },
          create: {
            inventoryItemId: payload.inventoryItemId,
            locationId: payload.locationId,
            quantity: payload.actualQuantity,
            reservedQuantity: 0,
            availableQuantity: payload.actualQuantity,
          },
        });

        const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
        const movement = await prisma.stockMovement.create({
          data: {
            movementNumber,
            type: StockMovementType.ADJUSTMENT,
            inventoryItemId: payload.inventoryItemId,
            quantity: payload.adjustmentQty || Math.abs(payload.actualQuantity),
            toLocationId: payload.locationId,
            performedById: actorId,
            notes: payload.reason || "Approved Stock Adjustment",
          },
        });

        executionResult = { balance, movement };
        await AuditService.logAction(AuditAction.ADJUST, {
          module: "Stock",
          entityType: "StockMovement",
          entityId: movement.id,
          actorId,
          metadata: { balanceId: balance.id, actualQuantity: payload.actualQuantity },
        });
      } else if (action === "IN") {
        const balance = await prisma.stockBalance.upsert({
          where: {
            inventoryItemId_locationId: {
              inventoryItemId: payload.inventoryItemId,
              locationId: payload.locationId,
            },
          },
          update: {
            quantity: { increment: payload.quantity },
            availableQuantity: { increment: payload.quantity },
          },
          create: {
            inventoryItemId: payload.inventoryItemId,
            locationId: payload.locationId,
            quantity: payload.quantity,
            reservedQuantity: 0,
            availableQuantity: payload.quantity,
          },
        });

        const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
        const movement = await prisma.stockMovement.create({
          data: {
            movementNumber,
            type: StockMovementType.STOCK_IN,
            inventoryItemId: payload.inventoryItemId,
            quantity: payload.quantity,
            toLocationId: payload.locationId,
            performedById: actorId,
            notes: payload.notes || "Approved Stock Intake",
          },
        });

        executionResult = { balance, movement };
        await AuditService.logAction(AuditAction.STOCK_IN, {
          module: "Stock",
          entityType: "StockMovement",
          entityId: movement.id,
          actorId,
          metadata: { balanceId: balance.id, quantity: payload.quantity },
        });
      } else if (action === "TRANSFER") {
        const qty = payload.quantity || 1;
        const fromBalance = await prisma.stockBalance.update({
          where: {
            inventoryItemId_locationId: {
              inventoryItemId: payload.inventoryItemId,
              locationId: payload.fromLocationId,
            },
          },
          data: {
            quantity: { decrement: qty },
            availableQuantity: { decrement: qty },
          },
        });

        const toBalance = await prisma.stockBalance.upsert({
          where: {
            inventoryItemId_locationId: {
              inventoryItemId: payload.inventoryItemId,
              locationId: payload.toLocationId,
            },
          },
          update: {
            quantity: { increment: qty },
            availableQuantity: { increment: qty },
          },
          create: {
            inventoryItemId: payload.inventoryItemId,
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
            inventoryItemId: payload.inventoryItemId,
            quantity: qty,
            fromLocationId: payload.fromLocationId,
            toLocationId: payload.toLocationId,
            performedById: actorId,
            notes: payload.notes || "Approved Stock Transfer",
          },
        });

        executionResult = { movement, fromBalance, toBalance };
        await AuditService.logAction(AuditAction.TRANSFER, {
          module: "Stock",
          entityType: "StockMovement",
          entityId: movement.id,
          actorId,
        });
      }
      break;
    }

    // ─────────────────────────────────────────────────────────────
    // 4. REQUISITION (SUBMISSION APPROVAL)
    // ─────────────────────────────────────────────────────────────
    case ApprovalEntityType.REQUISITION: {
      const targetReqId = entityId || request.entityId;
      if (!targetReqId) throw new ApiError(httpStatus.BAD_REQUEST, "Missing target requisition id");

      // 1. Fetch current requisition with lines
      const reqRecord = await prisma.requisition.findUnique({
        where: { id: targetReqId },
        include: { lines: true },
      });

      if (!reqRecord) throw new ApiError(httpStatus.NOT_FOUND, "Target requisition not found!");

      // Never resurrect a requisition that has already moved on (cancelled,
      // rejected, partially/fully issued, ...) back to APPROVED.
      if (
        reqRecord.status !== RequestStatus.UNDER_REVIEW &&
        reqRecord.status !== RequestStatus.SUBMITTED
      ) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Requisition '${reqRecord.requestNumber}' is '${reqRecord.status}' and can no longer be approved through this request.`
        );
      }

      // 2. Set all lines to APPROVED and approvedQty = requestedQty
      await prisma.requisitionLine.updateMany({
        where: { requisitionId: targetReqId },
        data: {
          status: RequestLineStatus.APPROVED,
        },
      });

      // Update approvedQty to match requestedQty for each line
      for (const line of reqRecord.lines) {
        await prisma.requisitionLine.update({
          where: { id: line.id },
          data: {
            approvedQty: line.requestedQty,
          },
        });
      }

      // 3. Mark Requisition as APPROVED
      executionResult = await prisma.requisition.update({
        where: { id: targetReqId },
        data: {
          status: RequestStatus.APPROVED,
        },
        include: {
          lines: { include: { inventoryItem: true } },
          requester: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      await AuditService.logAction(AuditAction.APPROVE, {
        module: "Requisition",
        entityType: "Requisition",
        entityId: targetReqId,
        actorId,
        metadata: { requestNumber: reqRecord.requestNumber, status: RequestStatus.APPROVED },
      });

      await NotificationService.createNotification({
        userId: reqRecord.requesterId,
        type: "REQUISITION",
        title: "Requisition Approved",
        message: `Your requisition '${reqRecord.requestNumber}' has been approved and is pending distribution.`,
        referenceType: "Requisition",
        referenceId: reqRecord.id,
      });
      await NotificationService.notifyRole({
        roleCode: "STORE_OFFICER",
        type: "REQUISITION",
        title: "Requisition Ready for Distribution",
        message: `Requisition '${reqRecord.requestNumber}' has been approved and is ready for distribution.`,
        referenceType: "Requisition",
        referenceId: reqRecord.id,
      });
      break;
    }

    // ─────────────────────────────────────────────────────────────
    // 5. DEPARTMENT
    // ─────────────────────────────────────────────────────────────
    case ApprovalEntityType.DEPARTMENT: {
      if (action === "CREATE") {
        executionResult = await prisma.department.create({ data: payload });
        await AuditService.logCreate({
          module: "Department",
          entityType: "Department",
          entityId: executionResult.id,
          actorId,
          afterData: executionResult,
        });
      } else if (action === "UPDATE") {
        if (!entityId) throw new ApiError(httpStatus.BAD_REQUEST, "Missing entityId for department update");
        executionResult = await prisma.department.update({
          where: { id: entityId },
          data: payload,
        });
        await AuditService.logAction(AuditAction.UPDATE, {
          module: "Department",
          entityType: "Department",
          entityId,
          actorId,
        });
      } else if (action === "DELETE") {
        if (!entityId) throw new ApiError(httpStatus.BAD_REQUEST, "Missing entityId for department deletion");
        executionResult = await prisma.department.delete({ where: { id: entityId } });
        await AuditService.logAction(AuditAction.DELETE, {
          module: "Department",
          entityType: "Department",
          entityId,
          actorId,
        });
      }
      break;
    }

    // ─────────────────────────────────────────────────────────────
    // 6. LOCATION (BUILDING, FLOOR, ROOM, STOCK LOCATION)
    // ─────────────────────────────────────────────────────────────
    case ApprovalEntityType.BUILDING: {
      if (action === "CREATE") {
        executionResult = await prisma.building.create({ data: payload });
      } else if (action === "UPDATE") {
        executionResult = await prisma.building.update({ where: { id: entityId }, data: payload });
      } else if (action === "DELETE") {
        executionResult = await prisma.building.delete({ where: { id: entityId } });
      }
      break;
    }

    case ApprovalEntityType.STOCK_LOCATION: {
      if (action === "CREATE") {
        executionResult = await prisma.stockLocation.create({ data: payload });
      } else if (action === "UPDATE") {
        executionResult = await prisma.stockLocation.update({ where: { id: entityId }, data: payload });
      } else if (action === "DELETE") {
        executionResult = await prisma.stockLocation.delete({ where: { id: entityId } });
      }
      break;
    }

    // ─────────────────────────────────────────────────────────────
    // 7. USER PROFILE / STATUS
    // ─────────────────────────────────────────────────────────────
    case ApprovalEntityType.USER: {
      if (action === "UPDATE") {
        executionResult = await prisma.user.update({
          where: { id: entityId },
          data: payload,
        });
      }
      break;
    }

    default: {
      executionResult = { message: "Approved without dedicated execution handler", payload };
    }
  }

  return executionResult;
};

export const ApprovalExecutionService = {
  executeApprovedRequest,
};
