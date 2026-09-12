import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../helpers/queryBuilder";
import prisma from "../../../shared/prisma";
import { ICreateCategoryPayload, IUpdateCategoryPayload } from "./category.interface";
import { sanitizeCategoryCode, validateSelfParent } from "./category.utils";
import { AuditService } from "../Audit/audit.service";

const createCategory = async (
  payload: ICreateCategoryPayload,
  actorId?: string
) => {
  const code = sanitizeCategoryCode(payload.code);
  const existing = await prisma.category.findUnique({
    where: { code },
  });

  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, `Category code '${payload.code}' already exists!`);
  }

  if (payload.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: payload.parentId },
    });
    if (!parent) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Specified parent category does not exist!");
    }
  }

  const category = await prisma.category.create({
    data: payload,
    include: {
      parent: true,
    },
  });

  await AuditService.logCreate({
    module: "Category",
    entityType: "Category",
    entityId: category.id,
    actorId,
    afterData: category as any,
  });

  return category;
};

const getAllCategories = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(prisma.category as any, query, {
    fields: {
      name: { type: "string", searchable: true, sortable: true, filterable: true },
      code: { type: "string", searchable: true, sortable: true, filterable: true },
      parentId: { type: "string", filterable: true },
      createdAt: { type: "date", sortable: true, filterable: true },
    },
  })
    .search(["name", "code", "description"])
    .filter()
    .sort()
    .paginate()
    .include({
      parent: true,
      _count: {
        select: {
          children: true,
          inventoryItems: true,
        },
      },
    });

  const data = await queryBuilder.execute();
  const meta = await queryBuilder.countTotal();

  return { meta, data };
};

const getCategoryTree = async () => {
  const rootCategories = await prisma.category.findMany({
    where: {
      OR: [
        { parentId: null },
        { parentId: { isSet: false } as any },
      ],
    },
    include: {
      children: {
        include: {
          children: true,
          _count: {
            select: {
              inventoryItems: true,
            },
          },
        },
      },
      _count: {
        select: {
          inventoryItems: true,
        },
      },
    },
  });

  return rootCategories;
};

const getCategoryById = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      parent: true,
      children: true,
      _count: {
        select: {
          inventoryItems: true,
        },
      },
    },
  });

  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found!");
  }

  return category;
};

const updateCategory = async (
  id: string,
  payload: IUpdateCategoryPayload,
  actorId?: string
) => {
  const before = await getCategoryById(id);

  if (payload.parentId) {
    if (validateSelfParent(id, payload.parentId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "A category cannot be its own parent!");
    }
    const parent = await prisma.category.findUnique({
      where: { id: payload.parentId },
    });
    if (!parent) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Specified parent category does not exist!");
    }
  }

  const updated = await prisma.category.update({
    where: { id },
    data: payload,
    include: {
      parent: true,
      children: true,
    },
  });

  await AuditService.logUpdate({
    module: "Category",
    entityType: "Category",
    entityId: id,
    actorId,
    beforeData: before as any,
    afterData: updated as any,
  });

  return updated;
};

const deleteCategory = async (id: string, actorId?: string) => {
  const category = await getCategoryById(id);

  const childCount = await prisma.category.count({
    where: { parentId: id },
  });

  if (childCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete category because it has ${childCount} subcategories! Delete or reassign them first.`
    );
  }

  const itemCount = await prisma.inventoryItem.count({
    where: { categoryId: id },
  });

  if (itemCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete category because it has ${itemCount} associated inventory item(s)!`
    );
  }

  await prisma.category.delete({
    where: { id },
  });

  await AuditService.logDelete({
    module: "Category",
    entityType: "Category",
    entityId: id,
    actorId,
    beforeData: category as any,
  });

  return { message: "Category deleted successfully!" };
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  getCategoryTree,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
