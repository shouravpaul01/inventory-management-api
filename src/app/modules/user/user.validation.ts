import { z } from "zod";
const updateRoleValidation=z.object({
    body:z.object({
        isApproved:z.boolean({
            required_error: "The fiels is required",
            invalid_type_error: "User is not approved.",
          })
    })
})
const updateBlockedStatusValidation=z.object({
    body:z.object({
        isBlocked:z.boolean({
            required_error: "The fiels is required",
            invalid_type_error: "User is not approved.",
          })
    })
})
export const UserValidations={
    updateRoleValidation,
    updateBlockedStatusValidation
}