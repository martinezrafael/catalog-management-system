import { Queue } from "bullmq";
import { env } from "../../../config/env.js";
import { Redis } from "ioredis";

const queueRedisConnection = new Redis(env.REDIS_URL, {
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

export const productQueue = new Queue("product_queue", {
  connection: queueRedisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
