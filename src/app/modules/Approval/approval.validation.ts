import { z } from "zod";

const createPolicyZodSchema = z.object({
  body: z
    .object({
      permissionCode: z.string().optional(),
      permissionCodes: z.array(z.string()).min(1, "At least one permission is required").optional(),
      requirement: z.enum(["REQUIRED", "NOT_REQUIRED"]).default("REQUIRED"),
      scope: z.enum(["ROLE", "USER", "SYSTEM"]).default("USER"),
      roleId: z.string().optional(),
      userId: z.string().optional(),
      condition: z.any().optional(),
      approvalLevelCount: z.number().int().min(1).max(5).default(1),
      allowSelfApproval: z.boolean().default(false),
    })
    .refine(
      (data) => Boolean(data.permissionCode) || Boolean(data.permissionCodes && data.permissionCodes.length > 0),
      {
        message: "At least one permission code is required",
        path: ["permissionCodes"],
      }
    ),
});

const updatePolicyZodSchema = z.object({
  body: z.object({
    permissionCode: z.string().optional(),
    permissionCodes: z.array(z.string()).min(1, "At least one permission is required").optional(),
    requirement: z.enum(["REQUIRED", "NOT_REQUIRED"]).optional(),
    scope: z.enum(["ROLE", "USER", "SYSTEM"]).optional(),
    roleId: z.string().nullable().optional(),
    userId: z.string().nullable().optional(),
    condition: z.any().optional(),
    approvalLevelCount: z.number().int().min(1).max(5).optional(),
    allowSelfApproval: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

const actionApprovalRequestZodSchema = z
  .object({
    body: z.object({
      decision: z.enum(["APPROVE", "REJECT", "REQUEST_CHANGE"]),
      comments: z.string().optional(),
    }),
  })
  .refine(
    (data) => {
      if (
        (data.body.decision === "REJECT" || data.body.decision === "REQUEST_CHANGE") &&
        (!data.body.comments || data.body.comments.trim().length < 5)
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        "Mandatory feedback/reason of at least 5 characters is required when rejecting or requesting changes.",
      path: ["body", "comments"],
    }
  );

const resubmitApprovalRequestZodSchema = z.object({
  body: z.object({
    updatedPayload: z.record(z.string(), z.any()).refine((obj) => Object.keys(obj).length > 0, {
      message: "updatedPayload must contain corrected data fields",
    }),
    resubmitReason: z.string().optional(),
  }),
});

export const ApprovalValidation = {
  createPolicyZodSchema,
  updatePolicyZodSchema,
  actionApprovalRequestZodSchema,
  resubmitApprovalRequestZodSchema,
};
