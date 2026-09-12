import { z } from "zod";

const createInventoryItemZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Item name is required"),
    code: z.string().optional(),
    sku: z.string().optional(),
    description: z.string().optional(),
    categoryId: z.string().min(1, "Category ID is required"),
    brand: z.string().optional(),
    model: z.string().optional(),
    trackingType: z.enum(["SERIALIZED", "BULK"]),
    isReturnable: z.boolean().default(false),
    defaultIssuePolicy: z.enum(["PERMANENT", "TEMPORARY", "GIFT"]).default("PERMANENT"),
    unitName: z.string().default("Piece"),
    minimumStock: z.coerce.number().min(0).default(0),
    reorderLevel: z.coerce.number().min(0).default(0),
    isActive: z.boolean().default(true),
  }),
});

const updateInventoryItemZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    sku: z.string().optional(),
    description: z.string().optional(),
    categoryId: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    trackingType: z.enum(["SERIALIZED", "BULK"]).optional(),
    isReturnable: z.boolean().optional(),
    defaultIssuePolicy: z.enum(["PERMANENT", "TEMPORARY", "GIFT"]).optional(),
    unitName: z.string().optional(),
    minimumStock: z.coerce.number().min(0).optional(),
    reorderLevel: z.coerce.number().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
});

const createCodeSequenceZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Sequence name is required"),
    code: z.string().min(1, "Sequence code is required").transform((c) => c.toUpperCase()),
    prefix: z.string().min(1, "Prefix is required").transform((p) => p.toUpperCase()),
    separator: z.string().default("-"),
    startNumber: z.coerce.number().int().min(1).default(1),
    paddingLength: z.coerce.number().int().min(2).max(10).default(6),
    yearIncluded: z.boolean().default(false),
    monthIncluded: z.boolean().default(false),
    isActive: z.boolean().default(true),
  }),
});

const updateCodeSequenceZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    prefix: z.string().optional().transform((p) => (p ? p.toUpperCase() : undefined)),
    separator: z.string().optional(),
    paddingLength: z.coerce.number().int().min(2).max(10).optional(),
    yearIncluded: z.boolean().optional(),
    monthIncluded: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const InventoryItemValidation = {
  createInventoryItemZodSchema,
  updateInventoryItemZodSchema,
  createCodeSequenceZodSchema,
  updateCodeSequenceZodSchema,
};
