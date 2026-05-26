import { Queue, type QueueOptions, type JobsOptions } from "bullmq";
import { env } from "../../../config/env.js";
import { Redis } from "ioredis";

export const queueRedisConnection = new Redis(env.REDIS_URL, {
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
  removeOnComplete: true,
  removeOnFail: false,
};

const queueOptions: QueueOptions = {
  connection: queueRedisConnection,
  defaultJobOptions,
};

export const productQueue = new Queue("product_queue", queueOptions);
