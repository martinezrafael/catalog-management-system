import express from "express";
import cors from "cors";
import { env } from "../../../config/env.js";
import { SearchProductController } from "../../../modules/products/infra/http/controllers/SearchProductController.js";
import { CreateProductController } from "../../../modules/products/infra/http/controllers/CreateProductController.js";
import { UpdateProductController } from "../../../modules/products/infra/http/controllers/UpdateProductController.js";
import { CreateCategoryController } from "../../../modules/products/infra/http/controllers/CreateCategoryController.js";
import { SearchCategoryController } from "../../../modules/products/infra/http/controllers/SearchCategoryController.js";
import { ensureIdempotency } from "./middlewares/idempotency.js";

const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
  }),
);

app.use(express.json());

const createProductController = new CreateProductController();
const searchProductController = new SearchProductController();
const updateProductController = new UpdateProductController();
const createCategoryController = new CreateCategoryController();
const searchCategoryController = new SearchCategoryController();

app.post("/api/v1/products", ensureIdempotency, createProductController.handle);
app.get("/api/v1/products", searchProductController.index);
app.put("/api/v1/products/:id", updateProductController.put);
app.patch("/api/v1/products/:id", updateProductController.patch);
app.put(
  "/api/v1/products/:id/categories",
  updateProductController.updateCategories,
);

app.post("/api/v1/categories", createCategoryController.handle);
app.get("/api/v1/categories", searchCategoryController.index);

export { app };
