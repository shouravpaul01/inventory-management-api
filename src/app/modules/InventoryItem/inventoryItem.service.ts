import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../helpers/queryBuilder";
import prisma from "../../../shared/prisma";
import { uploadToCloudinary, deleteFromCloudinary } from "../../../helpers/cloudinary";
import { generateSequentialCode } from "../../../helpers/sequenceGenerator";

// ════════════════════════════════════════════════════════════
// 1. INVENTORY ITEM (CATALOG MASTER)
// ════════════════════════════════════════════════════════════

const createInventoryItem = async (
  payload: {
    name: string;
    code?: string;
    sku?: string;
    description?: string;
    categoryId: string;
    brand?: string;
    model?: string;
    trackingType: "SERIALIZED" | "BULK";
    isReturnable?: boolean;
    defaultIssuePolicy?: "PERMANENT" | "TEMPORARY" | "GIFT";
    unitName?: string;
    minimumStock?: number;
    reorderLevel?: number;
    isActive?: boolean;
  },
  file?: Express.Multer.File,
  actorId?: string
) => {
  // Validate category
  const category = await prisma.category.findUnique({
    where: { id: payload.categoryId },
  });

  if (!category) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Specified category does not exist!");
  }

  // Generate or sanitize item code
  let itemCode = payload.code?.trim().toUpperCase();
  if (!itemCode) {
    const categoryPrefix = category.code.slice(0, 3).toUpperCase();
    itemCode = await generateSequentialCode(`${categoryPrefix}_SEQ`, categoryPrefix);
  } else {
    const existing = await prisma.inventoryItem.findUnique({
      where: { code: itemCode },
    });
    if (existing) {
      throw new ApiError(httpStatus.CONFLICT, `Item code '${itemCode}' already exists!`);
    }
  }

  // Validate unique SKU if provided
  if (payload.sku) {
    const existingSku = await prisma.inventoryItem.findUnique({
      where: { sku: payload.sku },
    });
    if (existingSku) {
      throw new ApiError(httpStatus.CONFLICT, `SKU '${payload.sku}' already exists!`);
    }
  }

  // Upload image to Cloudinary if provided
  let imageUrl: string | undefined;
  let imagePublicId: string | undefined;

  if (file) {
    const uploadRes = await uploadToCloudinary(file, "inventory/items");
    imageUrl = uploadRes.imageUrl;
    imagePublicId = uploadRes.imagePublicId;
  }

  const item = await prisma.inventoryItem.create({
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
      imageUrl,
      imagePublicId,
    },
    include: {
      category: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "CREATE",
      module: "Inventory",
      entityType: "InventoryItem",
      entityId: item.id,
      afterData: item as any,
    },
  });

  return item;
};

const getAllInventoryItems = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.inventoryItem as any, query, {
    fields: {
      name: { type: "string", searchable: true, sortable: true, filterable: true },
      code: { type: "string", searchable: true, sortable: true, filterable: true },
      sku: { type: "string", searchable: true, sortable: true, filterable: true },
      brand: { type: "string", searchable: true, sortable: true, filterable: true },
      model: { type: "string", searchable: true, sortable: true, filterable: true },
      trackingType: { type: "string", sortable: true, filterable: true },
      isReturnable: { type: "boolean", sortable: true, filterable: true },
      isActive: { type: "boolean", sortable: true, filterable: true },
      categoryId: { type: "string", filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["name", "code", "sku", "brand", "model", "description"])
    .filter()
    .sort()
    .paginate()
    .include({
      category: true,
      _count: {
        select: {
          units: true,
          stockBalances: true,
        },
      },
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const getInventoryItemById = async (id: string) => {
  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      category: true,
      stockBalances: {
        include: {
          location: true,
        },
      },
      _count: {
        select: {
          units: true,
          requisitionLines: true,
          distributionLines: true,
          returnLines: true,
        },
      },
    },
  });

  if (!item) {
    throw new ApiError(httpStatus.NOT_FOUND, "Inventory item not found!");
  }

  // Get serialized unit summary by status if SERIALIZED
  let unitStats = null;
  if (item.trackingType === "SERIALIZED") {
    const units = await prisma.inventoryUnit.groupBy({
      by: ["status"],
      where: { inventoryItemId: id },
      _count: { _all: true },
    });
    unitStats = units.reduce((acc, curr) => {
      acc[curr.status] = curr._count._all;
      return acc;
    }, {} as Record<string, number>);
  }

  return {
    ...item,
    unitStats,
  };
};

const updateInventoryItem = async (
  id: string,
  payload: {
    name?: string;
    sku?: string;
    description?: string;
    categoryId?: string;
    brand?: string;
    model?: string;
    trackingType?: "SERIALIZED" | "BULK";
    isReturnable?: boolean;
    defaultIssuePolicy?: "PERMANENT" | "TEMPORARY" | "GIFT";
    unitName?: string;
    minimumStock?: number;
    reorderLevel?: number;
    isActive?: boolean;
  },
  file?: Express.Multer.File,
  actorId?: string
) => {
  const before = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!before) {
    throw new ApiError(httpStatus.NOT_FOUND, "Inventory item not found!");
  }

  if (payload.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: payload.categoryId } });
    if (!cat) throw new ApiError(httpStatus.BAD_REQUEST, "Specified category does not exist!");
  }

  if (payload.sku && payload.sku !== before.sku) {
    const existingSku = await prisma.inventoryItem.findUnique({ where: { sku: payload.sku } });
    if (existingSku) throw new ApiError(httpStatus.CONFLICT, `SKU '${payload.sku}' is already in use!`);
  }

  let imageUrl = before.imageUrl;
  let imagePublicId = before.imagePublicId;

  if (file) {
    if (imagePublicId) {
      await deleteFromCloudinary(imagePublicId);
    }
    const uploadRes = await uploadToCloudinary(file, "inventory/items");
    imageUrl = uploadRes.imageUrl;
    imagePublicId = uploadRes.imagePublicId;
  }

  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: {
      ...payload,
      imageUrl,
      imagePublicId,
    },
    include: {
      category: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "UPDATE",
      module: "Inventory",
      entityType: "InventoryItem",
      entityId: id,
      beforeData: before as any,
      afterData: updated as any,
    },
  });

  return updated;
};

const deleteInventoryItem = async (id: string, actorId?: string) => {
  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) {
    throw new ApiError(httpStatus.NOT_FOUND, "Inventory item not found!");
  }

  const unitCount = await prisma.inventoryUnit.count({ where: { inventoryItemId: id } });
  const balanceCount = await prisma.stockBalance.count({ where: { inventoryItemId: id, quantity: { gt: 0 } } });

  if (unitCount > 0 || balanceCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete item because it has existing physical units (${unitCount}) or active stock balances (${balanceCount})! Deactivate it instead.`
    );
  }

  if (item.imagePublicId) {
    await deleteFromCloudinary(item.imagePublicId);
  }

  await prisma.inventoryItem.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "DELETE",
      module: "Inventory",
      entityType: "InventoryItem",
      entityId: id,
      beforeData: item as any,
    },
  });

  return { message: "Inventory item deleted successfully!" };
};

// ════════════════════════════════════════════════════════════
// 2. CODE SEQUENCE MANAGEMENT
// ════════════════════════════════════════════════════════════

const createCodeSequence = async (
  payload: {
    name: string;
    code: string;
    prefix: string;
    separator?: string;
    startNumber?: number;
    paddingLength?: number;
    yearIncluded?: boolean;
    monthIncluded?: boolean;
    isActive?: boolean;
  },
  actorId?: string
) => {
  const existing = await prisma.codeSequence.findUnique({
    where: { code: payload.code },
  });

  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, `Code sequence '${payload.code}' already exists!`);
  }

  const seq = await prisma.codeSequence.create({
    data: {
      ...payload,
      createdById: actorId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "CREATE",
      module: "CodeSequence",
      entityType: "CodeSequence",
      entityId: seq.id,
      afterData: seq as any,
    },
  });

  return seq;
};

const getAllCodeSequences = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.codeSequence as any, query, {
    fields: {
      name: { type: "string", searchable: true, sortable: true, filterable: true },
      code: { type: "string", searchable: true, sortable: true, filterable: true },
      prefix: { type: "string", searchable: true, sortable: true, filterable: true },
      isActive: { type: "boolean", sortable: true, filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["name", "code", "prefix"])
    .filter()
    .sort()
    .paginate();

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const getCodeSequenceById = async (id: string) => {
  const seq = await prisma.codeSequence.findUnique({ where: { id } });
  if (!seq) throw new ApiError(httpStatus.NOT_FOUND, "Code sequence not found!");
  return seq;
};

const updateCodeSequence = async (
  id: string,
  payload: {
    name?: string;
    prefix?: string;
    separator?: string;
    paddingLength?: number;
    yearIncluded?: boolean;
    monthIncluded?: boolean;
    isActive?: boolean;
  },
  actorId?: string
) => {
  const before = await getCodeSequenceById(id);

  const updated = await prisma.codeSequence.update({
    where: { id },
    data: payload,
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "UPDATE",
      module: "CodeSequence",
      entityType: "CodeSequence",
      entityId: id,
      beforeData: before as any,
      afterData: updated as any,
    },
  });

  return updated;
};

export const InventoryItemService = {
  // InventoryItem
  createInventoryItem,
  getAllInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
  // CodeSequence
  createCodeSequence,
  getAllCodeSequences,
  getCodeSequenceById,
  updateCodeSequence,
};
