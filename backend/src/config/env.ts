import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.url({
    message: "A DATABASE_URL precisa ser uma URL válida de conexão",
  }),
  REDIS_URL: z.url("A REDIS_URL precisa ser uma URL válida"),
  REDIS_PASSWORD: z.string().min(1, "A REDIS_PASSWORD é obrigatória"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("Invalid environment variables:");
  _env.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  });
  throw new Error("Invalid environment variables.");
}

export const env = _env.data;
