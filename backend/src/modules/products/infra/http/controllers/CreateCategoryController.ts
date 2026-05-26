import type { Request, Response } from "express";
import { db } from "../../../../../shared/infra/database/postgres.js";
import { CreateCategorySchema } from "../../../dtos/CreateCategoryDTO.js";

export class CreateCategoryController {
  async handle(req: Request, res: Response): Promise<Response> {
    const { name } = CreateCategorySchema.parse(req.body);

    const categoryExists = await db("categories").where({ name }).first();
    if (categoryExists) {
      return res.status(409).json({
        error: "Uma categoria com este nome já está cadastrada.",
      });
    }

    const [category] = await db("categories").insert({ name }).returning("*");

    return res.status(201).json(category);
  }
}
