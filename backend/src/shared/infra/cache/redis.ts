import { env } from "../../../config/env.js";
import { Redis } from "ioredis";

export const redisClient = new Redis(env.REDIS_URL, {
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  reconnectOnError: (err: Error) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

redisClient.on("connect", () => console.log("Redis conectado com sucesso."));
redisClient.on("error", (err: unknown) =>
  console.error("Erro no cliente Redis:", err),
);
