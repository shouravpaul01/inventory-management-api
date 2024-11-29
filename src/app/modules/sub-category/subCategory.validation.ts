import { z } from "zod";

export const SubCatValidationSchema = z.object({
  body: z.object({
    name: z.string().nonempty({ message: "Name is required." }),
    category: z.string().nonempty({ message: "Category is required." }),  
  })
});
