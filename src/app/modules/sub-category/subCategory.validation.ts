import { z } from "zod";

export const SubCatValidationSchema = z.object({
  body: z.object({
    name: z.string().nonempty({ message: "The field is required." }),
    category: z.string().nonempty({ message: "The field is required." }),
    code: z.string().nonempty({ message: "The field is required." }).min(3, "Code mussst be at least 3 characters.")
    .max(6, "Code must be at most 6 characters."),
    
  })
});
