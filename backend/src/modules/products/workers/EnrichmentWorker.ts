import { Worker, type Job } from "bullmq";
import { db } from "../../../shared/infra/database/postgres.js";
import { queueRedisConnection } from "../../../shared/infra/queues/bullmq.js";

const worker = new Worker(
  "product_queue",
  async (job: Job) => {
    const { productId, sku } = job.data;

    const productExists = await db("products")
      .where({ id: productId, status: "PROCESSING" })
      .first();

    if (!productExists) {
      console.warn(
        `Tentativa de processamento de Job inválido ou forjado para o ID: ${productId}`,
      );
      return;
    }
  },
  {
    connection: queueRedisConnection,
  },
);
