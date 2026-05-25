import type { Request, Response } from "express";
import { db } from "../../../../../shared/infra/database/postgres.js";

export class UpdateProductController {
  async put(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const data = req.body;

    const [updatedProduct] = await db("products")
      .where({ id })
      .update({
        name: data.name,
        description: data.description,
        price_cents: data.price_cents,
      })
      .returning("*");

    return res.status(200).json(updatedProduct);
  }

  async patch(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const fieldsToUpdate = req.body;

    if (fieldsToUpdate.attributes) {
      const blacklistedKeys = [
        "is_promotional",
        "verified_vendor",
        "system_priority",
      ];
      blacklistedKeys.forEach((key) => delete fieldsToUpdate.attributes[key]);

      const attributesPayload = JSON.stringify(fieldsToUpdate.attributes);
      delete fieldsToUpdate.attributes;

      const [updatedProduct] = await db("products")
        .where({ id })
        .update({
          ...fieldsToUpdate,
          attributes: db.raw("attributes || ?::jsonb", [attributesPayload]),
        })
        .returning("*");

      return res.status(200).json(updatedProduct);
    }

    const [updatedProduct] = await db("products")
      .where({ id })
      .update(fieldsToUpdate)
      .returning("*");

    return res.status(200).json(updatedProduct);
  }

  async updateCategories(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const { category_ids } = req.body;

    await db.transaction(async (trx) => {
      await trx("product_categories").where({ product_id: id }).del();

      if (category_ids && category_ids.length > 0) {
        await trx("product_categories").insert(
          category_ids.map((catId: number) => ({
            product_id: id,
            category_id: catId,
          })),
        );
      }
    });

    return res.status(204).send();
  }
}
