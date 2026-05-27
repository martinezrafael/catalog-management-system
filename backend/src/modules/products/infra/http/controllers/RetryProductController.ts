import type { Request, Response } from "express";
import { db } from "../../../../../shared/infra/database/postgres.js";
import { productQueue } from "../../../../../shared/infra/queues/bullmq.js";

export class RetryProductController {
  async handle(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    const targetProductId = parseInt(id as string, 10);

    if (isNaN(targetProductId)) {
      return res
        .status(400)
        .json({ error: "O parâmetro ID deve ser um número válido." });
    }

    const product = await db("products")
      .where({ id: targetProductId, status: "FAILED" })
      .first();

    if (!product) {
      return res.status(404).json({
        error: `Produto ID ${targetProductId} em estado de falha não foi encontrado.`,
      });
    }

    await db("products")
      .where({ id: targetProductId })
      .update({ status: "PROCESSING" });

    await productQueue.add(
      "enrich_product",
      {
        productId: product.id,
        sku: product.sku,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    );

    return res
      .status(200)
      .json({ message: "Produto reinjetado na fila com sucesso!" });
  }
}
