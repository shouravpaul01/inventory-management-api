import { z } from "zod";

export const accessoryValidation=z.object({
   body:z.object({
    category:z.string().nonempty("Category is required."),
    subCategory:z.string().nonempty("Sub Category is required."),
    isItReturnable:z.string().nonempty("Returnable is required."),
    name:z.string().nonempty("Name is required."),
    codeTitle:z.string().optional(),
   //  quantity:z.number({required_error:"Quantity is required.",invalid_type_error:"Quantity is required."}),
    description:z.string().optional()
   }).superRefine((data:any, ctx) => {
      
      if (data.isItReturnable === "true") {
        // Check if codeTitle is provided
        if (!data.codeTitle) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["codeTitle"],
            message: "Code Title is required.",
          });
        }
    
        // Check if codeTitle exceeds 50 characters
        if (data.codeTitle && data.codeTitle.length > 3) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["codeTitle"],
            message: "Code Title cannot exceed 4 characters.",
          });
        }
    
        // Check if codeTitle contains only alphanumeric characters
        if (data.codeTitle && /[^a-zA-Z0-9]/.test(data.codeTitle)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["codeTitle"],
            message:
              "Code Title cannot contain symbols; only letters and numbers are allowed.",
          });
        }
      }
    })
})