import { z } from "zod";

const createRequisitionZodSchema = z.object({
  body: z.object({
    type: z.enum(["REQUISITION", "ORDER"]).optional().default("REQUISITION"),
    departmentId: z.string().min(1, "Department ID is required"),
    purpose: z.string().min(3, "Purpose must be at least 3 characters"),
    remarks: z.string().optional(),
    isTemporary: z.boolean().optional().default(false),
    requiredFrom: z.coerce.date().optional(),
    requiredUntil: z.coerce.date().optional(),
    lines: z
      .array(
        z.object({
          inventoryItemId: z.string().min(1, "Inventory Item ID is required"),
          requestedQty: z.coerce.number().int().positive("Requested quantity must be at least 1"),
          requestedIssuePolicy: z.enum(["PERMANENT", "TEMPORARY", "GIFT"]).optional(),
          remarks: z.string().optional(),
        })
      )
      .min(1, "Requisition must have at least one line item"),
  }),
});

const updateRequisitionZodSchema = z.object({
  body: z.object({
    purpose: z.string().min(3).optional(),
    remarks: z.string().optional(),
    isTemporary: z.boolean().optional(),
    requiredFrom: z.coerce.date().optional(),
    requiredUntil: z.coerce.date().optional(),
    lines: z
      .array(
        z.object({
          id: z.string().optional(), // Line ID if existing
          inventoryItemId: z.string().min(1),
          requestedQty: z.coerce.number().int().positive(),
          requestedIssuePolicy: z.enum(["PERMANENT", "TEMPORARY", "GIFT"]).optional(),
          remarks: z.string().optional(),
        })
      )
      .optional(),
  }),
});

const reviewLineZodSchema = z.object({
  lineId: z.string().min(1, "Line ID is required"),
  approvedQty: z.coerce.number().int().min(0, "Approved quantity cannot be negative"),
  status: z.enum(["APPROVED", "PARTIALLY_APPROVED", "REJECTED"]),
  remarks: z.string().optional(),
});

const reviewRequisitionZodSchema = z.object({
  body: z.object({
    decision: z.enum(["APPROVED", "PARTIALLY_APPROVED", "REJECTED"]),
    comments: z.string().optional(),
    lines: z.array(reviewLineZodSchema).min(1, "Must review at least one line"),
  }),
});

export const RequisitionValidation = {
  createRequisitionZodSchema,
  updateRequisitionZodSchema,
  reviewRequisitionZodSchema,
};
