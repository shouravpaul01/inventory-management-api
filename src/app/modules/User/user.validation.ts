import { z } from "zod";

const createUserZodSchema = z.object({
  body: z.object({
    employeeId: z.string().min(1, "Employee ID is required"),
    username: z.string().min(3, "Username must be at least 3 characters").toLowerCase(),
    email: z.string().email("Valid email is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    departmentId: z.string().min(1, "Department ID is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    roleIds: z.array(z.string()).optional(),
  }),
});

const updateUserZodSchema = z.object({
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    departmentId: z.string().optional(),
  }),
});

const updateUserStatusZodSchema = z.object({
  body: z.object({
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"], {
      message: "Status must be ACTIVE, INACTIVE, or SUSPENDED",
    }),
  }),
});

const assignUserRolesZodSchema = z.object({
  body: z.object({
    roleIds: z.array(z.string().min(1, "Invalid role ID")),
  }),
});

const overrideUserPermissionsZodSchema = z.object({
  body: z.object({
    overrides: z.array(
      z.object({
        permissionId: z.string().min(1, "Permission ID is required"),
        effect: z.enum(["GRANT", "REVOKE"]),
      })
    ),
  }),
});

export const UserValidation = {
  createUserZodSchema,
  updateUserZodSchema,
  updateUserStatusZodSchema,
  assignUserRolesZodSchema,
  overrideUserPermissionsZodSchema,
};