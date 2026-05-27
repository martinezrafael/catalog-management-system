import { Router } from "express";
import { CreateProductController } from "../../../modules/products/infra/http/controllers/CreateProductController.js";
import { SearchProductController } from "../../../modules/products/infra/http/controllers/SearchProductController.js";
import { UpdateProductController } from "../../../modules/products/infra/http/controllers/UpdateProductController.js";
import { CreateCategoryController } from "../../../modules/products/infra/http/controllers/CreateCategoryController.js";
import { SearchCategoryController } from "../../../modules/products/infra/http/controllers/SearchCategoryController.js";
import { RetryProductController } from "../../../modules/products/infra/http/controllers/RetryProductController.js";
import { ensureIdempotency } from "./middlewares/idempotency.js";

export const routes = Router();

const createProductController = new CreateProductController();
const searchProductController = new SearchProductController();
const updateProductController = new UpdateProductController();
const createCategoryController = new CreateCategoryController();
const searchCategoryController = new SearchCategoryController();
const retryProductController = new RetryProductController();

routes.post("/products", ensureIdempotency, createProductController.handle);

routes.get("/products", searchProductController.handle);

routes.put("/products/:id", updateProductController.put);
routes.patch("/products/:id", updateProductController.patch);
routes.put(
  "/products/:id/categories",
  updateProductController.updateCategories,
);

routes.post("/products/:id/retry", retryProductController.handle);

routes.post("/categories", createCategoryController.handle);
routes.get("/categories", searchCategoryController.index);
