import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../../../../../shared/infra/database/postgres.js";

const SearchQuerySchema = z.object({
  q: z.string().max(100, "Termo de busca excessivamente longo").optional(),
  status: z.enum(["PROCESSING", "PROCESSED", "FAILED"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100, "O limite máximo permitido é 100")
    .default(20),
});

export class SearchProductController {
  async index(req: Request, res: Response): Promise<Response> {
    const parsedQuery = SearchQuerySchema.parse(req.query);
    const offset = (parsedQuery.page - 1) * parsedQuery.limit;

    const query = db("products").select("*");

    if (parsedQuery.q) {
      query.where((builder) =>
        builder
          .whereILike("name", `%${parsedQuery.q}%`)
          .orWhereILike("description", `%${parsedQuery.q}%`),
      );
    }

    if (parsedQuery.status) {
      query.where("status", parsedQuery.status);
    }

    const data = await query
      .limit(parsedQuery.limit)
      .offset(offset)
      .orderBy("created_at", "desc");

    return res.status(200).json({
      page: parsedQuery.page,
      limit: parsedQuery.limit,
      data,
    });
  }
}
