import { z } from "zod";

const createFacultySchemaValidation=z.object({
    body:z.object({
        name:z.string({required_error:"Name is required."}),
        roomNo:z.number({required_error:"Name is required.",invalid_type_error:"Invalid Room No."}),
        designation:z.string({required_error:"Designation is required."}),
        email:z.string({required_error:"Email is required."}),
    })
})

export const FacultyValidations={
    createFacultySchemaValidation
}