import supertest from "supertest";
import { app } from "../../src/shared/infra/http/app.js";

describe("Validações de Payload e DTO", () => {
  it("deve aceitar o payload e delegar o processamento do SKU para a fila assíncrona", async () => {
    const payload = {
      name: "Notebook Assíncrono",
      sku: "VAL-9999-A1",
      price_cents: 500000,
      category_ids: [1],
      attributes: {},
    };

    const response = await supertest(app)
      .post("/api/v1/products")
      .send(payload);

    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty("id");
    expect(response.body.status).toBe("PROCESSING");
  });
});
