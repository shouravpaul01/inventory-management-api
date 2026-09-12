import { z } from "zod";

const returnLineItemZodSchema = z.object({
  inventoryItemId: z.string().min(1, "Inventory Item ID is required"),
  inventoryUnitId: z.string().optional(),
  destinationLocationId: z.string().min(1, "Destination Location ID is required"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  condition: z.enum(["SAME", "GOOD", "DAMAGED", "LOST", "NEEDS_REPAIR"]).default("GOOD"),
  remarks: z.string().optional(),
});

const returnLocationSplitZodSchema = z.object({
  locationId: z.string().min(1, "Location ID is required"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
});

const processReturnZodSchema = z.object({
  body: z.object({
    distributionId: z.string().min(1, "Distribution ID is required"),
    remarks: z.string().optional(),
    status: z.enum(["EXPECTED", "PARTIALLY_RETURNED", "RETURNED", "OVERDUE", "LOST"]).optional().default("RETURNED"),
    lines: z.array(returnLineItemZodSchema).min(1, "Must return at least one item line"),
    locationSplits: z.array(returnLocationSplitZodSchema).optional(),
  }),
});

export const ReturnValidation = {
  processReturnZodSchema,
};
