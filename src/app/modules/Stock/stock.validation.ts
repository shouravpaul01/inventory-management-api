import { z } from "zod";

const stockInZodSchema = z.object({
  body: z.object({
    inventoryItemId: z.string().min(1, "Inventory Item ID is required"),
    locationId: z.string().min(1, "Location ID is required"),
    quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
    type: z.enum(["PURCHASE", "STOCK_IN", "INITIAL_STOCK"]).optional().default("STOCK_IN"),
    notes: z.string().optional(),
    autoGenerateCodes: z.boolean().optional(),
    units: z
      .array(
        z.object({
          uniqueCode: z.string().optional(),
          serialNumber: z.string().optional(),
          condition: z.enum(["NEW", "GOOD", "FAIR", "DAMAGED"]).optional(),
          warrantyEndDate: z.string().optional(),
          purchaseDate: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .optional(),
  }),
});

const stockOutZodSchema = z.object({
  body: z.object({
    inventoryItemId: z.string().min(1, "Inventory Item ID is required"),
    locationId: z.string().min(1, "Location ID is required"),
    quantity: z.coerce.number().int().positive("Quantity must be greater than 0").optional(),
    unitIds: z.array(z.string()).optional(),
    type: z.enum(["STOCK_OUT", "DAMAGE", "LOSS", "DISPOSAL", "GIFT"]).optional().default("STOCK_OUT"),
    notes: z.string().optional(),
  }),
});

const transferStockZodSchema = z.object({
  body: z.object({
    inventoryItemId: z.string().min(1, "Inventory Item ID is required"),
    fromLocationId: z.string().min(1, "Source Location ID is required"),
    toLocationId: z.string().min(1, "Destination Location ID is required"),
    quantity: z.coerce.number().int().positive().optional(),
    inventoryUnitId: z.string().optional(),
    unitIds: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }),
});

const adjustStockZodSchema = z.object({
  body: z.object({
    inventoryItemId: z.string().min(1, "Inventory Item ID is required"),
    locationId: z.string().min(1, "Location ID is required"),
    newQuantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
    notes: z.string().min(3, "Mandatory reason for audit reconciliation"),
  }),
});

const reserveStockZodSchema = z.object({
  body: z.object({
    inventoryItemId: z.string().min(1, "Inventory Item ID is required"),
    locationId: z.string().min(1, "Location ID is required"),
    quantity: z.coerce.number().int().positive("Quantity must be positive"),
    referenceType: z.string().optional(),
    referenceId: z.string().optional(),
  }),
});

const releaseReservationZodSchema = z.object({
  body: z.object({
    inventoryItemId: z.string().min(1, "Inventory Item ID is required"),
    locationId: z.string().min(1, "Location ID is required"),
    quantity: z.coerce.number().int().positive("Quantity must be positive"),
    referenceType: z.string().optional(),
    referenceId: z.string().optional(),
  }),
});

export const StockValidation = {
  stockInZodSchema,
  stockOutZodSchema,
  transferStockZodSchema,
  adjustStockZodSchema,
  reserveStockZodSchema,
  releaseReservationZodSchema,
};
