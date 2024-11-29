import { z } from "zod";

const loginValidationSchema = z.object({
  body: z.object({
    userId: z.string().nonempty("User ID is required."),
    password: z.string().nonempty("Password is required."),
  }),
});
const changePasswordValidationSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "The field is reuired." })
      .email({ message: "Enter a valid Email." }),
    oldPassword: z
      .string({ required_error: "The field is reuired." })
      .min(6, { message: "Password must be six characters." }),
    password: z
      .string({ required_error: "The field is reuired." })
      .min(6, { message: "Password must be six characters." }),
  }),
});

const matchedOTPValidation=z.object({
  body:z.object({
      token:z.string().nonempty("OTP is expired.Please try again."),
      otp:z.number({required_error:"OTP is reuired."}).min(6,{message:"OTP must be 6-Digits."}),
     
  })
})
const resetPasswordValidation=z.object({
  body:z.object({
      password:z.string({required_error:"The field is reuired."}).min(6,{message:"Password must be 6 characters."})
     
  })
})
export const AuthValidations={
  loginValidationSchema,
  changePasswordValidationSchema,
  matchedOTPValidation,
  resetPasswordValidation
}
