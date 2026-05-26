import { env } from "../../../config/env.js";
import { Redis, type RedisOptions } from "ioredis";

const redisOptions: RedisOptions = {
  password: env.REDIS_PASSWORD,

  maxRetriesPerRequest: null,

  reconnectOnError: (err: Error) => {
    const targetError = "READONLY";
    return err.message.includes(targetError);
  },
};

export const redisClient = new Redis(env.REDIS_URL, redisOptions);

redisClient.on("connect", () => {
  console.log("[Redis] Connection estabilished succesfully");
});

redisClient.on("error", (err: unknown) => {
  console.error("[Redis] Client connection error", err);
});
