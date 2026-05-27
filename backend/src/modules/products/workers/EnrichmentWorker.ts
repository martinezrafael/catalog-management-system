import { Worker, type Job } from "bullmq";
import Opossum from "opossum";
import axios from "axios";
import { z } from "zod";
import { db } from "../../../shared/infra/database/postgres.js";
import { queueRedisConnection } from "../../../shared/infra/queues/bullmq.js";

const FakeStoreProductSchema = z.object({
  id: z.coerce.number().int().positive(),
  title: z.string(),
  price: z.coerce.number().nonnegative(),
  description: z.string().optional().default(""),
  category: z.string(),
  image: z.string().url().optional(),
  rating: z
    .object({
      rate: z.coerce.number(),
      count: z.coerce.number().int(),
    })
    .optional(),
});

type FakeStoreProduct = z.infer<typeof FakeStoreProductSchema>;

const breakerOptions = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
};

const externalApiBreaker = new Opossum(
  async (fakeStoreId: string): Promise<FakeStoreProduct> => {
    const baseUrl = process.env.FAKE_STORE_API_URL;
    const targetUrl = baseUrl?.endsWith("/")
      ? `${baseUrl}products/${fakeStoreId}`
      : `${baseUrl}/products/${fakeStoreId}`;

    const response = await axios.get(targetUrl);

    return FakeStoreProductSchema.parse(response.data);
  },
  breakerOptions,
);

async function processProductEnrichment(job: Job): Promise<void> {
  const { productId, sku } = job.data;

  const productExists = await db("products")
    .where({ id: productId, status: "PROCESSING" })
    .first();

  if (!productExists) {
    console.warn(
      `[Worker] Tentativa de processamento ignorada para o ID: ${productId}`,
    );
    return;
  }

  const fakeStoreId = (sku as string).replace(/\D/g, "") || "1";

  const fakeStoreData = await externalApiBreaker.fire(fakeStoreId);

  const enrichedAttributes = {
    external_data: fakeStoreData,
    api_enrich_at: new Date().toISOString(),
  };

  await db("products")
    .where({ id: productId })
    .update({
      attributes: db.raw("attributes || ?::jsonb", [
        JSON.stringify(enrichedAttributes),
      ]),
      status: "PROCESSED",
    });
}

export const worker = new Worker(
  "product_queue",
  async (job: Job) => {
    try {
      await processProductEnrichment(job);
    } catch (error) {
      throw error;
    }
  },
  {
    connection: queueRedisConnection,
    limiter: { max: 10, duration: 1000 },
  },
);

worker.on("failed", async (job: Job | undefined, err: Error) => {
  if (!job) return;

  if (job.attemptsMade >= 5) {
    await db("products")
      .where({ id: job.data.productId })
      .update({ status: "FAILED" });

    console.error(
      `[Worker] Job esgotado após 5 tentativas. Produto ${job.data.productId} movido para FAILED. Erro: ${err.message}`,
    );
  }
});
