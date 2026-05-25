import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url({
    message: "A DATABASE_URL precisa ser uma URL válida de conexão",
  }),
  REDIS_URL: z.string().url({
    message: "A REDIS_URL precisa ser uma URL válida",
  }),
  REDIS_PASSWORD: z.string().default(""),
  FAKE_STORE_API_URL: z.string().url({
    message: "A FAKE_STORE_API_URL precisa ser uma URL válida",
  }),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Erro de validação nas variáveis de ambiente:");
  _env.error.issues.forEach((issue) => {
    console.error(`  - Campo [${issue.path.join(".")}]: ${issue.message}`);
  });
  throw new Error("Invalid environment variables.");
}

export const env = _env.data;
