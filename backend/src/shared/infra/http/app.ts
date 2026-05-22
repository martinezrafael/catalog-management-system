import express from "express";
import { SearchProductController } from "../../../modules/products/infra/http/controllers/SearchProductController.js";
import { CreateProductController } from "../../../modules/products/infra/http/controllers/CreateProductController.js";
import { ensureIdempotency } from "./middlewares/idempotency.js";

const app = express();

app.use(express.json());

const createProductController = new CreateProductController();
const searchProductController = new SearchProductController();

app.post("/api/v1/products", ensureIdempotency, createProductController.handle);
app.get("/api/v1/products", searchProductController.index);

export { app };
