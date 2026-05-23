import type { Request, Response } from "express";
import { db } from "../../../../../shared/infra/database/postgres.js";

export class SearchCategoryController {
  async index(req: Request, res: Response): Promise<Response> {
    try {
      const categories = await db("categories")
        .select("*")
        .orderBy("name", "asc");

      return res.status(200).json(categories);
    } catch (error) {
      console.error("Erro ao buscar categorias no banco:", error);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
}
