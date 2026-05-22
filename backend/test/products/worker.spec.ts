import nock from "nock";
import axios from "axios";
import { Job } from "bullmq";
import { db } from "../../src/shared/infra/database/postgres.js";
import { env } from "../../src/config/env.js";

describe("Comportamento Resiliente do Consumidor", () => {
  beforeEach(async () => {
    await db("products").del();

    nock.cleanAll();
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("deve acionar o mecanismo de backoff exponencial caso a rota externa retorne instabilidade 503", async () => {
    const [mockProduct] = await db("products")
      .insert({
        name: "Notebook Gamer",
        sku: "NOT-9999-X1",
        price_cents: 500000,
        status: "PROCESSING",
        attributes: JSON.stringify({}),
      })
      .returning("*");

    const externalApiMock = nock(env.FAKE_STORE_API_URL)
      .get("/products/9999")
      .reply(503, { message: "Service Unavailable" });

    const fakeJob = {
      data: {
        productId: mockProduct.id,
        sku: mockProduct.sku,
      },
    } as Job;

    let executionError: any = null;
    try {
      const fakeStoreId = fakeJob.data.sku.replace(/\D/g, "");
      await axios.get(`${env.FAKE_STORE_API_URL}/products/${fakeStoreId}`);
    } catch (error: any) {
      executionError = error;
    }

    expect(executionError).toBeDefined();
    expect(executionError.response.status).toBe(503);

    expect(externalApiMock.isDone()).toBe(true);

    const productInDb = await db("products")
      .where({ id: mockProduct.id })
      .first();
    expect(productInDb.status).toBe("PROCESSING");
  });
});
