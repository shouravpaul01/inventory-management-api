import { z } from "zod";
const updateApprovedStatusValidation=z.object({
    body:z.object({
        isApproved:z.boolean({
            required_error: "The fiels is required",
            invalid_type_error: "User is not approved.",
          })
    })
})
const updateActiveStatusValidation=z.object({
    body:z.object({
        isActive:z.boolean({
            required_error: "The fiels is required",
            invalid_type_error: "User is not approved.",
          })
    })
})
export const UserValidations={
    updateApprovedStatusValidation,
    updateActiveStatusValidation
}