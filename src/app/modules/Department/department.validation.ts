import { z } from "zod";

const createDepartmentZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Department name is required"),
    code: z.string().min(1, "Department code is required").transform((c) => c.toUpperCase()),
    description: z.string().optional(),
  }),
});

const updateDepartmentZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const DepartmentValidation = {
  createDepartmentZodSchema,
  updateDepartmentZodSchema,
};
