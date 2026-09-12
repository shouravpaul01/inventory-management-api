import { z } from "zod";

const createRoleZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Role name is required"),
    code: z.string().min(1, "Role code is required").transform((v) => v.toUpperCase()),
    description: z.string().optional(),
    permissionIds: z.array(z.string()).optional(),
  }),
});

const updateRoleZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
  }),
});

const assignRolePermissionsZodSchema = z.object({
  body: z.object({
    permissionIds: z.array(z.string().min(1, "Invalid permission ID")),
  }),
});

export const RbacValidation = {
  createRoleZodSchema,
  updateRoleZodSchema,
  assignRolePermissionsZodSchema,
};
