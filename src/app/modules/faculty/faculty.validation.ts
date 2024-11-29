import { z } from "zod";

const createFacultySchemaValidation = z.object({
  body: z.object({
    name: z.string().nonempty("Name is required."),
    email: z
      .string()
      .nonempty("Email is required.")
      .email("Enter a valid email address."),
    roomNo: z
      .number({
        required_error: "Room no is required.",
        invalid_type_error: "Room no is required.",
      })
      .positive("Room no must be a postive number."),
    designation: z.string().nonempty("Designation is required."),
    department: z.string().nonempty("Department is required."),
  }),
});

export const FacultyValidations = {
  createFacultySchemaValidation,
};
