import { z } from "zod";
import dotenv from "dotenv";


dotenv.config();

const envSchema = z.object({
  // General
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  COMPOSE_FILE: z.string().optional(),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
  BACKEND_IMAGE_URL: z.string().url("BACKEND_IMAGE_URL must be a valid URL"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  REDIS_URL: z.string().default("redis://localhost:6379"),


  // JWT
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  EXPIRES_IN: z.string().min(1, "EXPIRES_IN is required"),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, "REFRESH_TOKEN_SECRET must be at least 32 characters"),
  REFRESH_TOKEN_EXPIRES_IN: z
    .string()
    .min(1, "REFRESH_TOKEN_EXPIRES_IN is required"),
  RESET_PASS_TOKEN: z.string().min(1, "RESET_PASS_TOKEN is required"),
  RESET_PASS_TOKEN_EXPIRES_IN: z
    .string()
    .min(1, "RESET_PASS_TOKEN_EXPIRES_IN is required"),
  RESET_PASS_LINK: z.string().url("RESET_PASS_LINK must be a valid URL"),

  // Email
  EMAIL: z.string().email("EMAIL must be a valid email address"),
  APP_PASS: z.string().min(1, "APP_PASS is required"),

  // cloudinary
  CLOUDINARY_CLOUD_NAME: z
    .string()
    .min(1, "CLOUDINARY_CLOUD_NAME is required"),

  CLOUDINARY_API_KEY: z
    .string()
    .min(1, "CLOUDINARY_API_KEY is required"),

  CLOUDINARY_API_SECRET: z
    .string()
    .min(1, "CLOUDINARY_API_SECRET is required"),

  CLOUDINARY_URL: z
    .string()
    .url("CLOUDINARY_URL must be a valid URL")
    .optional(),
    EPHE_PATH: z.string().default("./ephe"),



  // Admin Seed Data
  ADMIN_NAME: z.string().min(1, "ADMIN_NAME is required"),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email address"),
  ADMIN_PASSWORD: z.string().min(6, "ADMIN_PASSWORD must be at least 6 characters"),
});

// Export the inferred type so it can be used across the application
export type EnvConfig = z.infer<typeof envSchema>;

const validateEnv = envSchema.safeParse(process.env);

if (!validateEnv.success) {
  console.error("❌ Invalid or missing environment variables detected:\n");

  const fieldErrors = validateEnv.error.flatten().fieldErrors;
  for (const [field, errors] of Object.entries(fieldErrors)) {
    console.error(`   👉 ${field}: ${errors?.join(", ")}`);
  }

  console.error("\n🚨 Server startup aborted. Please check your .env file.");

  // Throwing an Error is a better practice than process.exit(1) in a module.
  // It allows test runners (like Jest) to catch the error instead of killing the entire test process.
  throw new Error("Invalid environment variables");
}

export const env = validateEnv.data;
