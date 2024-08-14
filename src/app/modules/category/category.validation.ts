import { z } from "zod";

const createCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().nonempty({ message: "The field is required." }),
    code: z.string().nonempty({ message: "The field is required." }).min(3, "Code mussst be at least 3 characters.")
    .max(6, "Code must be at most 6 characters."),
    
  })
});
const updateCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().nonempty({ message: "The field is required." }),
    code: z.string().nonempty({ message: "The field is required." }).min(3, "Code must be at least 3 characters.")
    .max(6, "Code must be at most 6 characters."),
  }),
 
});
export const CategoryValidations = {
  createCategoryValidationSchema,
  updateCategoryValidationSchema,
};