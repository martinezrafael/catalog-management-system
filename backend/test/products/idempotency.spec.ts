import supertest from "supertest";
import { app } from "../../src/shared/infra/http/app.js";
import { redisClient } from "../../src/shared/infra/cache/redis.js";

describe("Validação de Eficácia da Idempotência", () => {
  afterAll(async () => {
    await redisClient.quit();
  });

  it("deve interceptar requisições concorrentes com chaves idênticas e retornar exatamente o mesmo payload", async () => {
    const sharedKey = "test-deterministic-key-uuid";
    const payload = {
      name: "Item",
      sku: "TST-0001-Z9",
      price_cents: 4500,
      category_ids: [1],
    };

    const [res1, res2] = await Promise.all([
      supertest(app)
        .post("/api/v1/products")
        .set("Idempotency-Key", sharedKey)
        .send(payload),
      supertest(app)
        .post("/api/v1/products")
        .set("Idempotency-Key", sharedKey)
        .send(payload),
    ]);
    expect(res1.body.id).toEqual(res2.body.id);
  });
});
