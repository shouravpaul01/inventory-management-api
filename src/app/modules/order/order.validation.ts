import { z } from "zod";

// Schema for a single item in the array
const accessoryItemSchema = z.object({
  accessory: z.string().nonempty("Accessory ID is required"),
  expectedQuantity: z
    .number()
    .positive("Quantity must be an integer")
    .min(1, "Quantity must be at least 1"),
});

export const orderValidation = z
  .array(accessoryItemSchema)
  .nonempty("At least one accessory item is required");

  export const updateExpectedQuantitySchemaValidation = z.object({
body:z.object({
    accessory: z.string().nonempty("Accessory ID is required"),
    expectedQuantity: z
      .number()
      .positive("Quantity must be an integer")
      .min(1, "Quantity must be at least 1").max(5, "Quantity must be at most 5"),
})
});
export const returnedAccessoriesSchemaValidation = z.object({
body:z.object({
    returnedAccessoriesCodes: z
    .array(z.string())
    .nonempty("Returned accessories codes are required"),
})
});
