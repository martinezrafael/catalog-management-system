import type { Request, Response } from "express";
import { db } from "../../../../../shared/infra/database/postgres.js";
import { productQueue } from "../../../../../shared/infra/queues/bullmq.js";
import { redisClient } from "../../../../../shared/infra/cache/redis.js";

export class CreateProductController {
  async handle(req: Request, res: Response): Promise<Response> {
    const productData = req.body;

    const httpResponse = await db.transaction(async (trx) => {
      const [product] = await trx("products")
        .insert({
          name: productData.name,
          description: productData.description || "",
          sku: productData.sku,
          price_cents: productData.price_cents,
          attributes: JSON.stringify(productData.attributes || {}),
          status: "PROCESSING",
        })
        .returning("*");

      if (productData.category_ids && productData.category_ids.length > 0) {
        await trx("product_categories").insert(
          productData.category_ids.map((catId: number) => ({
            product_id: product.id,
            category_id: catId,
          })),
        );
      }

      await productQueue.add(
        "enrich_product",
        { productId: product.id, sku: product.sku },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      );

      return { id: product.id, status: product.status };
    });

    if (req.idempotencyCacheKey) {
      await redisClient.set(
        req.idempotencyCacheKey,
        JSON.stringify({ status: 202, body: httpResponse }),
        "EX",
        300,
      );
    }

    return res.status(202).json(httpResponse);
  }
}
