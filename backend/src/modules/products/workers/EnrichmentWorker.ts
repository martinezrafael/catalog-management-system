import { Worker, type Job } from "bullmq";
import Opossum from "opossum";
import axios from "axios";
import { z } from "zod";
import { db } from "../../../shared/infra/database/postgres.js";
import { queueRedisConnection } from "../../../shared/infra/queues/bullmq.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const FakeStoreProductSchema = z.object({
  id: z.coerce.number().int().positive(),
  title: z.string(),
  price: z.coerce.number().nonnegative(),
  description: z.string().optional().default(""),
  category: z.string(),
  image: z.string().url().optional(),
  rating: z
    .object({ rate: z.coerce.number(), count: z.coerce.number().int() })
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
    throw new Error(
      `[Abort] Produto ID ${productId} nao encontrado no banco com status PROCESSING.`,
    );
  }

  const queueStaggerDelay = (Number(productId) % 5) * 150;
  await delay(queueStaggerDelay);

  const match = (sku as string).match(/\d+/);
  const parsedSkuNumber = match ? match[0] : "";

  let fakeStoreId: string;

  if (parsedSkuNumber && Number(parsedSkuNumber) >= 21) {
    const dynamicId = (Number(productId) % 20) + 1;
    console.log(
      `[Worker] SKU central (${parsedSkuNumber}) fora de escopo. Ajustando determinidicamente para ID: ${dynamicId}`,
    );
    fakeStoreId = dynamicId.toString();
  } else {
    fakeStoreId = parsedSkuNumber ? String(Number(parsedSkuNumber)) : "1";
  }

  let fakeStoreData: FakeStoreProduct;

  try {
    fakeStoreData = await externalApiBreaker.fire(fakeStoreId);
  } catch (breakerError: any) {
    console.error(
      `[Worker] Circuit Breaker interceptou uma falha para o produto ${productId}: ${breakerError.message}`,
    );

    throw breakerError;
  }

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
    await processProductEnrichment(job);
  },
  {
    connection: queueRedisConnection,
    limiter: { max: 10, duration: 1000 },
  },
);

worker.on("failed", async (job: Job | undefined, err: Error) => {
  if (!job) return;

  const maxAttempts = job.opts.attempts || 1;
  const currentAttempts = job.attemptsMade;

  if (currentAttempts >= maxAttempts) {
    await db("products")
      .where({ id: job.data.productId })
      .update({ status: "FAILED" });

    console.error(
      `[Worker] Job falhou DEFINITIVAMENTE após ${currentAttempts} tentativas. Produto ${job.data.productId} movido para FAILED. Erro: ${err.message}`,
    );
  } else {
    console.warn(
      `[Worker] Tentativa ${currentAttempts}/${maxAttempts} falhou para o Produto ${job.data.productId}. Aguardando recuo exponencial (Backoff)... Erro: ${err.message}`,
    );
  }
});
