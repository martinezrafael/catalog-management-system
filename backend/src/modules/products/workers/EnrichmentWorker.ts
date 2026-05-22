import { Worker, type Job } from "bullmq";
import Opossum from "opossum";
import axios from "axios";
import { db } from "../../../shared/infra/database/postgres.js";
import { queueRedisConnection } from "../../../shared/infra/queues/bullmq.js";

interface FakeStoreProductResponse {
  title: string;
  category: string;
  price: number;
}

const breakerOptions = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
};

const externalApiBreaker = new Opossum(async (fakeStoreId: string) => {
  const baseUrl = process.env.FAKE_STORE_API_URL;

  const targetUrl = baseUrl?.endsWith("/")
    ? `${baseUrl}products/${fakeStoreId}`
    : `${baseUrl}/products/${fakeStoreId}`;

  const response = await axios.get<FakeStoreProductResponse>(targetUrl);
  return response.data;
}, breakerOptions);

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

    try {
      const fakeStoreId = (sku as string).replace(/\D/g, "") || "1";

      const fakeStoreData = await externalApiBreaker.fire(fakeStoreId);

      const enrichedAttributes = {
        external_title: fakeStoreData.title || "Não informado",
        external_category: fakeStoreData.category || "Geral",
        external_base_price: fakeStoreData.price || 0,
        api_enriched_at: new Date().toISOString(),
      };

      await db("products")
        .where({ id: productId })
        .update({
          attributes: db.raw("attributes || ?::jsonb", [
            JSON.stringify(enrichedAttributes),
          ]),
          status: "PROCESSED",
        });
    } catch (error) {
      throw error;
    }
  },
  {
    connection: queueRedisConnection,
    limiter: { max: 10, duration: 1000 },
  },
);
