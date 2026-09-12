import { z } from "zod";

const createInventoryUnitZodSchema = z.object({
  body: z.object({
    inventoryItemId: z.string().min(1, "Inventory Item ID is required"),
    uniqueCode: z.string().optional(),
    serialNumber: z.string().optional(),
    barcode: z.string().optional(),
    condition: z.enum(["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"]).optional().default("NEW"),
    locationId: z.string().optional(),
    purchaseDate: z.string().datetime().optional().or(z.string().date().optional()),
    warrantyEndDate: z.string().datetime().optional().or(z.string().date().optional()),
    notes: z.string().optional(),
  }),
});

const batchCreateUnitsZodSchema = z.object({
  body: z.object({
    inventoryItemId: z.string().min(1, "Inventory Item ID is required"),
    count: z.coerce.number().int().min(1).max(100, "Maximum 100 units per batch"),
    locationId: z.string().optional(),
    condition: z.enum(["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"]).optional().default("NEW"),
    notes: z.string().optional(),
    purchaseDate: z.string().datetime().optional().or(z.string().date().optional()),
    warrantyEndDate: z.string().datetime().optional().or(z.string().date().optional()),
  }),
});

const updateInventoryUnitZodSchema = z.object({
  body: z.object({
    serialNumber: z.string().optional(),
    barcode: z.string().optional(),
    condition: z.enum(["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"]).optional(),
    locationId: z.string().optional(),
    notes: z.string().optional(),
    warrantyEndDate: z.string().datetime().optional().or(z.string().date().optional()),
  }),
});

export const InventoryUnitValidation = {
  createInventoryUnitZodSchema,
  batchCreateUnitsZodSchema,
  updateInventoryUnitZodSchema,
};
