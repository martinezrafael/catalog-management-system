import type { Request, Response } from "express";
import { db } from "../../../../../shared/infra/database/postgres.js";
import { productQueue } from "../../../../../shared/infra/queues/bullmq.js";
import { redisClient } from "../../../../../shared/infra/cache/redis.js";

export class CreateProductController {
  async handle(req: Request, res: Response): Promise<Response> {
    const productData = req.body;

    const [product] = await db("products")
      .insert({
        name: productData.name,
        description: productData.description,
        sku: productData.sku,
        price_cents: productData.price_cents,
        attributes: JSON.stringify(productData.attributes),
        status: "PROCESSING",
      })
      .returning("*");

    await db("product_categories").insert(
      productData.category_ids.map((catId: number) => ({
        product_id: product.id,
        category_id: catId,
      })),
    );

    const jobPayload = { productId: product.id, sku: product.sku };
    await productQueue.add("enrich_product", jobPayload);

    const httpResponse = { id: product.id, status: product.status };

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
