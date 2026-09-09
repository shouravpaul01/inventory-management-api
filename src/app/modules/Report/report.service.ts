import prisma from "../../../shared/prisma";
import QueryBuilder from "../../../helpers/queryBuilder";
import { InventoryUnitStatus, IssueMode, RequestStatus, ReturnStatus } from "@prisma/client";

// ════════════════════════════════════════════════════════════
// 1. DASHBOARD OVERVIEW SUMMARY
// ════════════════════════════════════════════════════════════

const getDashboardOverview = async () => {
  const [
    totalCatalogItems,
    totalSerializedUnits,
    unitsInStock,
    unitsIssued,
    unitsDamaged,
    unitsMaintenance,
    totalDepartments,
    pendingRequisitions,
    approvedRequisitions,
  ] = await Promise.all([
    prisma.inventoryItem.count({ where: { isActive: true } }),
    prisma.inventoryUnit.count(),
    prisma.inventoryUnit.count({ where: { status: InventoryUnitStatus.IN_STOCK } }),
    prisma.inventoryUnit.count({ where: { status: InventoryUnitStatus.ISSUED } }),
    prisma.inventoryUnit.count({ where: { status: InventoryUnitStatus.DAMAGED } }),
    prisma.inventoryUnit.count({ where: { status: InventoryUnitStatus.MAINTENANCE } }),
    prisma.department.count(),
    prisma.requisition.count({
      where: {
        status: { in: [RequestStatus.SUBMITTED, RequestStatus.UNDER_REVIEW] },
      },
    }),
    prisma.requisition.count({
      where: {
        status: { in: [RequestStatus.APPROVED, RequestStatus.PARTIALLY_APPROVED] },
      },
    }),
  ]);

  // Aggregate bulk stock balances
  const balances = await prisma.stockBalance.aggregate({
    _sum: {
      quantity: true,
      availableQuantity: true,
      reservedQuantity: true,
    },
  });

  return {
    catalog: {
      totalItems: totalCatalogItems,
      departments: totalDepartments,
    },
    serializedAssets: {
      total: totalSerializedUnits,
      inStock: unitsInStock,
      issued: unitsIssued,
      damaged: unitsDamaged,
      maintenance: unitsMaintenance,
    },
    bulkStock: {
      totalQuantity: balances._sum.quantity || 0,
      availableQuantity: balances._sum.availableQuantity || 0,
      reservedQuantity: balances._sum.reservedQuantity || 0,
    },
    requisitions: {
      pendingReview: pendingRequisitions,
      approvedPendingIssue: approvedRequisitions,
    },
  };
};

// ════════════════════════════════════════════════════════════
// 2. LOW STOCK & REORDER MONITOR
// ════════════════════════════════════════════════════════════

const getLowStockReport = async () => {
  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    include: {
      stockBalances: {
        include: {
          location: true,
        },
      },
      category: true,
    },
  });

  const lowStockItems = items
    .map((item) => {
      const totalAvailable = item.stockBalances.reduce((sum, b) => sum + b.availableQuantity, 0);
      const totalQuantity = item.stockBalances.reduce((sum, b) => sum + b.quantity, 0);
      const isBelowMinimum = totalAvailable <= item.minimumStock;
      const isBelowReorder = totalAvailable <= item.reorderLevel;

      return {
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category?.name,
        trackingType: item.trackingType,
        minimumStock: item.minimumStock,
        reorderLevel: item.reorderLevel,
        currentTotal: totalQuantity,
        currentAvailable: totalAvailable,
        isBelowMinimum,
        isBelowReorder,
        needsReorder: isBelowMinimum || isBelowReorder,
        balancesByLocation: item.stockBalances.map((b) => ({
          locationName: b.location.name,
          locationCode: b.location.code,
          quantity: b.quantity,
          available: b.availableQuantity,
        })),
      };
    })
    .filter((item) => item.needsReorder);

  return {
    totalAlerts: lowStockItems.length,
    data: lowStockItems,
  };
};

// ════════════════════════════════════════════════════════════
// 3. USER ASSIGNED ASSETS
// ════════════════════════════════════════════════════════════

const getUserAssignedAssets = async (userId: string, query: Record<string, unknown>) => {
  const modifiedQuery = {
    ...query,
    currentHolderId: userId,
    status: InventoryUnitStatus.ISSUED,
  };

  const queryBuilder = new QueryBuilder(prisma.inventoryUnit as any, modifiedQuery, {
    fields: {
      uniqueCode: { type: "string", searchable: true, sortable: true },
      serialNumber: { type: "string", searchable: true },
      condition: { type: "string", filterable: true },
      currentHolderId: { type: "string", filterable: true },
      status: { type: "string", filterable: true },
      createdAt: { type: "date", sortable: true },
    },
  })
    .search(["uniqueCode", "serialNumber"])
    .filter()
    .sort()
    .paginate()
    .include({
      inventoryItem: {
        include: {
          category: true,
        },
      },
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

// ════════════════════════════════════════════════════════════
// 4. OVERDUE RETURNS REPORT
// ════════════════════════════════════════════════════════════

const getOverdueReturnsReport = async () => {
  const now = new Date();

  const overdueDistributions = await prisma.distribution.findMany({
    where: {
      issueMode: IssueMode.TEMPORARY,
      expectedReturnAt: { lt: now },
      returnTransactions: {
        none: {
          status: ReturnStatus.RETURNED,
        },
      },
    },
    include: {
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
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
      requisition: true,
    },
    orderBy: {
      expectedReturnAt: "asc",
    },
  });

  return {
    totalOverdue: overdueDistributions.length,
    data: overdueDistributions,
  };
};

// ════════════════════════════════════════════════════════════
// 5. MOVEMENT HISTORY LEDGER
// ════════════════════════════════════════════════════════════

const getMovementLedger = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.stockMovement as any, query, {
    fields: {
      movementNumber: { type: "string", searchable: true, sortable: true, filterable: true },
      type: { type: "string", sortable: true, filterable: true },
      inventoryItemId: { type: "string", filterable: true },
      inventoryUnitId: { type: "string", filterable: true },
      fromLocationId: { type: "string", filterable: true },
      toLocationId: { type: "string", filterable: true },
      performedById: { type: "string", filterable: true },
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

export const ReportService = {
  getDashboardOverview,
  getLowStockReport,
  getUserAssignedAssets,
  getOverdueReturnsReport,
  getMovementLedger,
};
