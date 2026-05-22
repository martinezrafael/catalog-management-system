import type { Request, Response } from "express";
import { db } from "../../../../../shared/infra/database/postgres.js";

export class SearchProductController {
  async index(req: Request, res: Response): Promise<Response> {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const data = await db("products")
      .select("*")
      .limit(Number(limit))
      .offset(offset);
    return res.status(200).json({ data });
  }
}
