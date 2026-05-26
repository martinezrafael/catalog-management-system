import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../../../../../shared/infra/database/postgres.js";

const CategorySearchSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export class SearchCategoryController {
  async index(req: Request, res: Response): Promise<Response> {
    try {
      const parsedQuery = CategorySearchSchema.parse(req.query);
      const offset = (parsedQuery.page - 1) * parsedQuery.limit;

      const categories = await db("categories")
        .select("*")
        .limit(parsedQuery.limit)
        .offset(offset)
        .orderBy("name", "asc");

      return res.status(200).json(categories);
    } catch (error) {
      console.error("Erro ao buscar categorias no banco:", error);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
}
