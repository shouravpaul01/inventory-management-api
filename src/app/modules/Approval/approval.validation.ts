import { z } from "zod";

const createPolicyZodSchema = z.object({
  body: z.object({
    permissionCode: z.string().min(1, "Permission code is required"),
    requirement: z.enum(["REQUIRED", "NOT_REQUIRED"]).default("REQUIRED"),
    scope: z.enum(["SYSTEM", "ROLE", "USER"]).default("SYSTEM"),
    roleId: z.string().optional(),
    userId: z.string().optional(),
    condition: z.any().optional(),
    approvalLevelCount: z.number().int().min(1).max(5).default(1),
    allowSelfApproval: z.boolean().default(false),
  }),
});

const updatePolicyZodSchema = z.object({
  body: z.object({
    requirement: z.enum(["REQUIRED", "NOT_REQUIRED"]).optional(),
    condition: z.any().optional(),
    approvalLevelCount: z.number().int().min(1).max(5).optional(),
    allowSelfApproval: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

const actionApprovalRequestZodSchema = z.object({
  body: z.object({
    decision: z.enum(["APPROVE", "REJECT", "REQUEST_CHANGE"]),
    comments: z.string().optional(),
  }),
});

export const ApprovalValidation = {
  createPolicyZodSchema,
  updatePolicyZodSchema,
  actionApprovalRequestZodSchema,
};
