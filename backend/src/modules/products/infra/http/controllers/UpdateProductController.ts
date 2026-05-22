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

      const [currentProduct] = await db("products")
        .where({ id })
        .select("attributes");
      fieldsToUpdate.attributes = {
        ...currentProduct.attributes,
        ...fieldsToUpdate.attributes,
      };
    }

    const [updatedProduct] = await db("products")
      .where({ id })
      .update(fieldsToUpdate)
      .returning("*");
    return res.status(200).json(updatedProduct);
  }
}
