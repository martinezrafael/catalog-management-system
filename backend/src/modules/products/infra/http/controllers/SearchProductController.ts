import type { Request, Response } from "express";
import { z } from "zod";
import type { Knex } from "knex";
import { db } from "../../../../../shared/infra/database/postgres.js";

const AdvancedSearchSchema = z.object({
  q: z.string().max(100, "Termo de busca excessivamente longo").optional(),
  status: z.enum(["PROCESSING", "PROCESSED", "FAILED"]).optional(),

  category_id: z.coerce
    .number({ message: "Category ID must be a valid number" })
    .int()
    .positive()
    .optional(),

  color: z.string().optional(),
  size: z.string().optional(),

  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(5),
});

export class SearchProductController {
  async handle(req: Request, res: Response): Promise<Response> {
    if (req.query["category_id"] === "all") {
      delete req.query["category_id"];
    }

    const parsedQuery = AdvancedSearchSchema.parse(req.query);
    const offset = (parsedQuery.page - 1) * parsedQuery.limit;

    const dataQuery = db("products").distinct("products.*");
    const countQuery = db("products")
      .count<{ count: string | number }>("products.id as count")
      .first();

    const applyFilters = (queryBuilder: Knex.QueryBuilder) => {
      if (parsedQuery.category_id) {
        queryBuilder
          .join(
            "product_categories",
            "products.id",
            "product_categories.product_id",
          )
          .where("product_categories.category_id", parsedQuery.category_id);
      }

      if (parsedQuery.q) {
        queryBuilder.where(
          (builder: Knex.QueryBuilder) =>
            builder
              .whereILike("products.name", `%${parsedQuery.q}%`)
              .orWhereILike("products.description", `%${parsedQuery.q}%`)
              .orWhereILike("products.sku", `%${parsedQuery.q}%`), // Adicionado busca por SKU por performance
        );
      }

      if (parsedQuery.status) {
        queryBuilder.where("products.status", parsedQuery.status);
      }

      if (parsedQuery.color) {
        queryBuilder.whereRaw("products.attributes->>'color' ILIKE ?", [
          `%${parsedQuery.color}%`,
        ]);
      }

      if (parsedQuery.size) {
        queryBuilder.whereRaw("products.attributes->>'size' = ?", [
          parsedQuery.size,
        ]);
      }
    };

    applyFilters(dataQuery);
    applyFilters(countQuery as unknown as Knex.QueryBuilder);

    const [products, totalCountResult] = await Promise.all([
      dataQuery
        .limit(parsedQuery.limit)
        .offset(offset)
        .orderBy("products.created_at", "desc"),
      countQuery,
    ]);

    const totalItems = Number(totalCountResult?.count || 0);
    const totalPages = Math.ceil(totalItems / parsedQuery.limit);

    return res.status(200).json({
      data: products,
      meta: {
        totalItems,
        totalPages,
        currentPage: parsedQuery.page,
        itemsPerPage: parsedQuery.limit,
      },
    });
  }
}
