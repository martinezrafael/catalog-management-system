import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../../../../../shared/infra/database/postgres.js";

const AdvancedSearchSchema = z.object({
  q: z.string().max(100, "Termo de busca excessivamente longo").optional(),
  status: z.enum(["PROCESSING", "PROCESSED", "FAILED"]).optional(),
  category_id: z.coerce.number().int().positive().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export class SearchProductController {
  async index(req: Request, res: Response): Promise<Response> {
    const parsedQuery = AdvancedSearchSchema.parse(req.query);
    const offset = (parsedQuery.page - 1) * parsedQuery.limit;

    const query = db("products").distinct("products.*");

    if (parsedQuery.category_id) {
      query
        .join(
          "product_categories",
          "products.id",
          "product_categories.product_id",
        )
        .where("product_categories.category_id", parsedQuery.category_id);
    }

    if (parsedQuery.q) {
      query.where((builder) =>
        builder
          .whereILike("products.name", `%${parsedQuery.q}%`)
          .orWhereILike("products.description", `%${parsedQuery.q}%`),
      );
    }

    if (parsedQuery.status) {
      query.where("products.status", parsedQuery.status);
    }

    if (parsedQuery.color) {
      query.whereRaw("products.attributes->>'color' = ?", [parsedQuery.color]);
    }

    if (parsedQuery.size) {
      query.whereRaw("products.attributes->>'size' = ?", [parsedQuery.size]);
    }

    const data = await query
      .limit(parsedQuery.limit)
      .offset(offset)
      .orderBy("products.created_at", "desc");

    return res.status(200).json({
      page: parsedQuery.page,
      limit: parsedQuery.limit,
      count: data.length,
      data,
    });
  }
}
