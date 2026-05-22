import supertest from "supertest";
import { app } from "../../src/shared/infra/http/app.js";

describe("Validações de Payload e DTO", () => {
  it("deve rejeitar SKUs fora do padrão regex estrutural esperado", async () => {
    const invalidPayload = {
      name: "Erro",
      sku: "sku-invalido-123",
      price_cents: 100,
      category_ids: [1],
    };
    const response = await supertest(app)
      .post("/api/v1/products")
      .send(invalidPayload);
    expect(response.status).toBe(400);
  });
});
