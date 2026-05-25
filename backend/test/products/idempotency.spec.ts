import supertest from "supertest";
import { app } from "../../src/shared/infra/http/app.js";
import { redisClient } from "../../src/shared/infra/cache/redis.js";
import { queueRedisConnection } from "../../src/shared/infra/queues/bullmq.js";

describe("Validação de Eficácia da Idempotência", () => {
  let createdTestKey = "";

  afterAll(async () => {
    if (createdTestKey) {
      await redisClient.del(`idempotency:${createdTestKey}`);
    }
    await redisClient.quit();
    await queueRedisConnection.quit();
  });

  it("deve interceptar requisições concorrentes com chaves idênticas e barrar a duplicidade", async () => {
    const sharedKey = `test-key-${Math.random().toString(36).substring(7)}`;
    createdTestKey = sharedKey; // Salva para o bloco afterAll limpar

    const payload = {
      name: "Item Concorrente",
      sku: "IDM-1234-XX",
      price_cents: 4500,
      category_ids: [1],
      attributes: {},
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

    const statuses = [res1.status, res2.status];

    expect(statuses).toContain(202);
    expect(statuses).toContain(409);
  });
});
