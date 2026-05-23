import type { Request, Response } from "express";
import { db } from "../../../../../shared/infra/database/postgres.js";

export class CreateCategoryController {
  async handle(req: Request, res: Response): Promise<Response> {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        error: "O nome da categoria é obrigatório e não pode ser vazio.",
      });
    }

    const categoryExists = await db("categories").where({ name }).first();
    if (categoryExists) {
      return res.status(409).json({
        error: "Uma categoria com este nome já está cadastrada.",
      });
    }

    const [category] = await db("categories")
      .insert({ name: name.trim() })
      .returning("*");

    return res.status(201).json(category);
  }
}
