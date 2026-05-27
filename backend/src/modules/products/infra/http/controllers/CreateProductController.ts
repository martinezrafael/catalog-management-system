/*
  Aqui, eu importo as instâncias centrais de barramento para que o controller consiga
  transacionar coordenadamente entre o banco e a malha fina do redis
*/

import type { Request, Response } from "express"; // tipagem do express
import { db } from "../../../../../shared/infra/database/postgres.js"; // a instancia de conexão
import { productQueue } from "../../../../../shared/infra/queues/bullmq.js"; // a fila
import { redisClient } from "../../../../../shared/infra/cache/redis.js"; // o client do redis

// crio a minha classe controladora
export class CreateProductController {
  /*
    o meu método assincrono recebe o objeto de requisição do express
    e retorna uma promise
  */

  async handle(req: Request, res: Response): Promise<Response> {
    /*Extração dos dados no meu objeto de requisição*/
    /*
      vale ressaltar que esses dados já foram validados na validação
      de schema do zod
    */
    const productData = req.body;

    // transação relacional ACID
    const httpResponse = await db.transaction(async (trx) => {
      const [product] = await trx("products")
        .insert({
          name: productData.name,
          description: productData.description,
          sku: productData.sku,
          price_cents: productData.price_cents,
          attributes: JSON.stringify(productData.attributes),
          status: "PROCESSING",
        })
        .returning("*"); //devolve instantaneamente o id gerado pelo autoincremento do banco e o timestamp de criação
      //inserção de categoria
      await trx("product_categories").insert(
        productData.category_ids.map((catId: number) => ({
          product_id: product.id,
          category_id: catId,
        })),
      );

      //monta o payload do job
      const jobPayload = { productId: product.id, sku: product.sku };

      // enfileiramento
      await productQueue.add("enrich_product", jobPayload);

      return { id: product.id, status: product.status };
    });

    // salva o cache de Idempotência
    if (req.idempotencyCacheKey) {
      await redisClient.set(
        req.idempotencyCacheKey,
        JSON.stringify({ status: 202, body: httpResponse }),
        "EX",
        300,
      );
    }

    return res.status(202).json(httpResponse);
  }
}
