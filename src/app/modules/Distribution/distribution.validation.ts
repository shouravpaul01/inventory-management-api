import { z } from "zod";

const createDistributionLineZodSchema = z.object({
  requisitionLineId: z.string().optional(),
  inventoryItemId: z.string().min(1, "Inventory Item ID is required"),
  inventoryUnitId: z.string().optional(),
  locationId: z.string().min(1, "Source Location ID is required"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  issueMode: z.enum(["PERMANENT", "TEMPORARY", "GIFT"]).optional().default("PERMANENT"),
  condition: z.enum(["NEW", "GOOD", "FAIR", "DAMAGED", "LOST", "DISPOSED"]).optional().default("GOOD"),
  expectedReturnAt: z.coerce.date().optional(),
  remarks: z.string().optional(),
});

const createDistributionZodSchema = z.object({
  body: z.object({
    requisitionId: z.string().min(1, "Requisition ID is required"),
    receiverId: z.string().min(1, "Receiver User ID is required"),
    issueMode: z.enum(["PERMANENT", "TEMPORARY", "GIFT"]).optional().default("PERMANENT"),
    handoverMethod: z.enum(["SELF_COLLECTION", "DELIVERED_BY_STAFF", "COURIER", "OTHER"]).default("SELF_COLLECTION"),
    expectedReturnAt: z.coerce.date().optional(),
    remarks: z.string().optional(),
    lines: z.array(createDistributionLineZodSchema).min(1, "Must distribute at least one item line"),
  }),
});

const confirmDeliveryZodSchema = z.object({
  body: z.object({
    deliveryStatus: z.enum(["DELIVERED", "RECEIVED", "REJECTED", "FAILED"]),
    receiverRemarks: z.string().optional(),
    deliveredById: z.string().optional(),
  }),
});

export const DistributionValidation = {
  createDistributionZodSchema,
  confirmDeliveryZodSchema,
};
