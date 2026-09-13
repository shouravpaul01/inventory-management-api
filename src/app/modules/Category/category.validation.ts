import { z } from "zod";

const createCategoryZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Category name is required"),
    code: z.string().min(1, "Category code is required").transform((c) => c.toUpperCase()),
    description: z.string().optional(),
    parentId: z.string().optional(),
  }),
});

const updateCategoryZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    parentId: z.string().nullable().optional(),
  }),
});

export const CategoryValidation = {
  createCategoryZodSchema,
  updateCategoryZodSchema,
};
