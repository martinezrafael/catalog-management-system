import type { Request, Response } from "express";
import { db } from "../../../../../shared/infra/database/postgres.js";
import { z } from "zod";
import { IdParamSchema } from "../../../dtos/IdParamDTO.js";
import { UpdateProductSchema } from "../../../dtos/UpdateProductDTO.js";

export class UpdateProductController {
  async put(req: Request, res: Response): Promise<Response> {
    const { id } = IdParamSchema.parse(req.params);

    const data = UpdateProductSchema.parse(req.body);

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
    const { id } = IdParamSchema.parse(req.params);

    const fieldsToUpdate = UpdateProductSchema.parse(req.body);

    if (fieldsToUpdate.attributes) {
      const blacklistedKeys = [
        "is_promotional",
        "verified_vendor",
        "system_priority",
      ];

      blacklistedKeys.forEach((key) => {
        if (fieldsToUpdate.attributes) {
          delete fieldsToUpdate.attributes[key];
        }
      });

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
    const { id } = IdParamSchema.parse(req.params);

    const updateCategoriesSchema = z.object({
      category_ids: z
        .array(z.number().int().positive())
        .min(1, "Ao menos uma categoria é obrigatória"),
    });

    const { category_ids } = updateCategoriesSchema.parse(req.body);

    await db.transaction(async (trx) => {
      await trx("product_categories").where({ product_id: id }).del();

      await trx("product_categories").insert(
        category_ids.map((catId: number) => ({
          product_id: id,
          category_id: catId,
        })),
      );
    });

    return res.status(204).send();
  }
}
