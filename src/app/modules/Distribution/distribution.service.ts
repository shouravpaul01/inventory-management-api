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
  DeliveryStatus,
  FulfillmentStatus,
  HandoverMethod,
  InventoryUnitStatus,
  IssueMode,
  RequestLineStatus,
  RequestStatus,
  StockMovementType,
  StockTrackingType,
} from "@prisma/client";
import {
  ICreateDistributionPayload,
  IConfirmDeliveryPayload,
} from "./distribution.interface";
import { DistributionUtils } from "./distribution.utils";

// ════════════════════════════════════════════════════════════
// 1. CREATE DISTRIBUTION (ISSUE ASSETS / BULK STOCK)
// ════════════════════════════════════════════════════════════

const createDistribution = async (
  payload: ICreateDistributionPayload,
  issuer: IAuthUser
) => {
  // 1. Verify Requisition
  const requisition = await prisma.requisition.findUnique({
    where: { id: payload.requisitionId },
    include: { lines: true },
  });

  if (!requisition) {
    throw new ApiError(httpStatus.NOT_FOUND, "Requisition not found!");
  }

  const validStatuses: RequestStatus[] = [
    RequestStatus.APPROVED,
    RequestStatus.PARTIALLY_APPROVED,
    RequestStatus.PARTIALLY_FULFILLED,
  ];

  if (!validStatuses.includes(requisition.status)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot distribute inventory for requisition in '${requisition.status}' status. Requisition must be approved.`
    );
  }

  // 2. Verify Receiver exists
  const receiver = await prisma.user.findUnique({
    where: { id: payload.receiverId },
  });
  if (!receiver) {
    throw new ApiError(httpStatus.NOT_FOUND, "Receiver user not found!");
  }

  // 3. Pre-validate stock & units for all lines
  const locationQtyMap: Record<string, number> = {};

  for (const line of payload.lines) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: line.inventoryItemId },
    });
    if (!item) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Inventory item '${line.inventoryItemId}' not found!`);
    }

    if (item.trackingType === StockTrackingType.SERIALIZED) {
      if (!line.inventoryUnitId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Item '${item.name}' is serialized. An inventoryUnitId is required for distribution.`
        );
      }

      const unit = await prisma.inventoryUnit.findUnique({
        where: { id: line.inventoryUnitId },
      });

      if (!unit) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Serialized unit '${line.inventoryUnitId}' not found!`
        );
      }

      if (unit.status !== InventoryUnitStatus.IN_STOCK && unit.status !== InventoryUnitStatus.RESERVED) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Serialized unit '${unit.uniqueCode}' is not available for issue. Current status: '${unit.status}'.`
        );
      }
    } else {
      // BULK stock check
      const balance = await prisma.stockBalance.findUnique({
        where: {
          inventoryItemId_locationId: {
            inventoryItemId: item.id,
            locationId: line.locationId,
          },
        },
      });

      if (!balance || balance.quantity < line.quantity) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Insufficient stock for item '${item.name}' at location '${line.locationId}'. Available: ${balance?.quantity || 0}, requested: ${line.quantity}.`
        );
      }
    }

    // Accumulate distribution location quantity
    locationQtyMap[line.locationId] = (locationQtyMap[line.locationId] || 0) + line.quantity;
  }

  // 4. Generate Distribution Number & Create Distribution record
  const distributionNo = await generateSequentialCode("DIST_SEQ", "DIST");

  const distribution = await prisma.distribution.create({
    data: {
      distributionNo,
      requisitionId: requisition.id,
      issuedById: issuer.id,
      receiverId: receiver.id,
      issueMode: (payload.issueMode as IssueMode) || IssueMode.PERMANENT,
      handoverMethod: (payload.handoverMethod as HandoverMethod) || HandoverMethod.SELF_COLLECTION,
      status: FulfillmentStatus.FULFILLED,
      expectedReturnAt: payload.expectedReturnAt,
      remarks: payload.remarks,
      lines: {
        create: payload.lines.map((l) => ({
          requisitionLineId: l.requisitionLineId,
          inventoryItemId: l.inventoryItemId,
          inventoryUnitId: l.inventoryUnitId,
          quantity: l.quantity,
          issueMode: (l.issueMode as IssueMode) || (payload.issueMode as IssueMode) || IssueMode.PERMANENT,
          condition: (l.condition as ConditionStatus) || ConditionStatus.GOOD,
          expectedReturnAt: l.expectedReturnAt || payload.expectedReturnAt,
          remarks: l.remarks,
        })),
      },
      locations: {
        create: Object.entries(locationQtyMap).map(([locationId, quantity]) => ({
          locationId,
          quantity,
        })),
      },
    },
    include: {
      lines: true,
      locations: true,
    },
  });

  // 5. Execute stock movements and asset updates
  for (const line of payload.lines) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: line.inventoryItemId },
    });

    if (item?.trackingType === StockTrackingType.SERIALIZED && line.inventoryUnitId) {
      // Update serialized unit holder and status
      await prisma.inventoryUnit.update({
        where: { id: line.inventoryUnitId },
        data: {
          status: InventoryUnitStatus.ISSUED,
          currentHolderId: receiver.id,
        },
      });

      // Record StockMovement
      const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
      await prisma.stockMovement.create({
        data: {
          movementNumber,
          type: StockMovementType.DISTRIBUTION,
          inventoryItemId: item.id,
          inventoryUnitId: line.inventoryUnitId,
          quantity: 1,
          fromLocationId: line.locationId,
          performedById: issuer.id,
          referenceType: "DISTRIBUTION",
          referenceId: distribution.id,
          notes: `Distributed to ${receiver.firstName || receiver.username} (${distribution.distributionNo})`,
        },
      });
    } else if (item) {
      // Decrement bulk stock balance
      await prisma.stockBalance.update({
        where: {
          inventoryItemId_locationId: {
            inventoryItemId: item.id,
            locationId: line.locationId,
          },
        },
        data: {
          quantity: { decrement: line.quantity },
          availableQuantity: { decrement: line.quantity },
        },
      });

      // Record StockMovement
      const movementNumber = await generateSequentialCode("MOV_SEQ", "MOV");
      await prisma.stockMovement.create({
        data: {
          movementNumber,
          type: StockMovementType.DISTRIBUTION,
          inventoryItemId: item.id,
          quantity: line.quantity,
          fromLocationId: line.locationId,
          performedById: issuer.id,
          referenceType: "DISTRIBUTION",
          referenceId: distribution.id,
          notes: `Bulk distributed to ${receiver.firstName || receiver.username} (${distribution.distributionNo})`,
        },
      });
    }

    // 6. Update RequisitionLine if requisitionLineId is provided
    if (line.requisitionLineId) {
      const reqLine = requisition.lines.find((rl) => rl.id === line.requisitionLineId);
      if (reqLine) {
        const newIssuedQty = reqLine.issuedQty + line.quantity;
        const lineStatus = DistributionUtils.calculateLineFulfillmentStatus(
          newIssuedQty,
          reqLine.approvedQty
        );

        await prisma.requisitionLine.update({
          where: { id: line.requisitionLineId },
          data: {
            issuedQty: newIssuedQty,
            status: lineStatus,
          },
        });
      }
    }
  }

  // 7. Update Requisition overall fulfillment and status
  const updatedReqLines = await prisma.requisitionLine.findMany({
    where: { requisitionId: requisition.id },
  });

  const { fulfillmentStatus, status } =
    DistributionUtils.calculateRequisitionFulfillment(updatedReqLines);

  await prisma.requisition.update({
    where: { id: requisition.id },
    data: {
      fulfillmentStatus,
      status,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: issuer.id,
      action: AuditAction.DISTRIBUTE,
      module: "Distribution",
      entityType: "Distribution",
      entityId: distribution.id,
      metadata: {
        distributionNo: distribution.distributionNo,
        requisitionId: requisition.id,
        receiverId: receiver.id,
        lineCount: payload.lines.length,
      },
    },
  });

  return getDistributionById(distribution.id);
};

// ════════════════════════════════════════════════════════════
// 2. CONFIRM DELIVERY
// ════════════════════════════════════════════════════════════

const confirmDelivery = async (
  distributionId: string,
  payload: IConfirmDeliveryPayload,
  file?: Express.Multer.File,
  actor?: IAuthUser
) => {
  const distribution = await prisma.distribution.findUnique({
    where: { id: distributionId },
  });

  if (!distribution) {
    throw new ApiError(httpStatus.NOT_FOUND, "Distribution record not found!");
  }

  let signatureUrl: string | undefined = undefined;
  if (file) {
    const uploadRes = await uploadToCloudinary(file, "inventory/signatures");
    signatureUrl = uploadRes.imageUrl;
  }

  const deliveryConfirmation = await prisma.deliveryConfirmation.upsert({
    where: { distributionId: distribution.id },
    update: {
      deliveryStatus: payload.deliveryStatus as DeliveryStatus,
      receiverRemarks: payload.receiverRemarks,
      deliveredById: payload.deliveredById,
      receivedById: actor?.id || distribution.receiverId,
      receivedAt: new Date(),
      signatureUrl: signatureUrl ?? undefined,
    },
    create: {
      distributionId: distribution.id,
      deliveryStatus: payload.deliveryStatus as DeliveryStatus,
      receiverRemarks: payload.receiverRemarks,
      deliveredById: payload.deliveredById,
      receivedById: actor?.id || distribution.receiverId,
      receivedAt: new Date(),
      signatureUrl,
    },
  });

  await prisma.distribution.update({
    where: { id: distribution.id },
    data: {
      deliveryStatus: payload.deliveryStatus as DeliveryStatus,
      deliveredAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor?.id,
      action: AuditAction.UPDATE,
      module: "Distribution",
      entityType: "DeliveryConfirmation",
      entityId: deliveryConfirmation.id,
      metadata: {
        distributionId: distribution.id,
        status: payload.deliveryStatus,
      },
    },
  });

  return deliveryConfirmation;
};

// ════════════════════════════════════════════════════════════
// 3. QUERIES
// ════════════════════════════════════════════════════════════

const getDistributionById = async (id: string) => {
  const distribution = await prisma.distribution.findUnique({
    where: { id },
    include: {
      requisition: true,
      issuedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          email: true,
        },
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          email: true,
          employeeId: true,
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
      deliveryConfirmation: true,
    },
  });

  if (!distribution) {
    throw new ApiError(httpStatus.NOT_FOUND, "Distribution not found!");
  }

  return distribution;
};

const getAllDistributions = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.distribution as any, query, {
    fields: {
      distributionNo: { type: "string", searchable: true, sortable: true, filterable: true },
      requisitionId: { type: "string", filterable: true },
      issuedById: { type: "string", filterable: true },
      receiverId: { type: "string", filterable: true },
      issueMode: { type: "string", sortable: true, filterable: true },
      status: { type: "string", sortable: true, filterable: true },
      deliveryStatus: { type: "string", sortable: true, filterable: true },
      handoverMethod: { type: "string", filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["distributionNo", "remarks"])
    .filter()
    .sort()
    .paginate()
    .include({
      issuedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
        },
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          employeeId: true,
        },
      },
      lines: {
        include: {
          inventoryItem: true,
          inventoryUnit: true,
        },
      },
      deliveryConfirmation: true,
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

export const DistributionService = {
  createDistribution,
  confirmDelivery,
  getDistributionById,
  getAllDistributions,
};
