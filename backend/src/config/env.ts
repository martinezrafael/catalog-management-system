import "dotenv/config";
import { z } from "zod";

const urlErrorMessage = (field: string, isConnection = false) => ({
  message: `${field} must be a valid ${isConnection ? "connection " : ""}URL`,
});

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().url(urlErrorMessage("DATABASE_URL", true)),

  REDIS_URL: z.string().url(urlErrorMessage("REDIS_URL")),

  REDIS_PASSWORD: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),

  FAKE_STORE_API_URL: z.string().url(urlErrorMessage("FAKE_STORE_API_URL")),

  FRONTEND_URL: z
    .string()
    .url(urlErrorMessage("FRONTEND_URL"))
    .default("http://localhost:3000"),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error("Environment variables validation error.");

  parseResult.error.issues.forEach((issue) => {
    const fieldPath = issue.path.join(".");
    console.error(`- Field[${fieldPath}]: ${issue.message}`);
  });

  throw new Error("Invalid enviroment variables");
}

export const env = parseResult.data;
