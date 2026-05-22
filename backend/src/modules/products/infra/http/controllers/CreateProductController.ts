import type { Request, Response } from "express";
import { db } from "../../../../../shared/infra/database/postgres.js";

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

    return res.status(202).json({ id: product.id, status: product.status });
  }
}
