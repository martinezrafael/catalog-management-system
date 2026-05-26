import { z } from "zod";
import { CreateProductSchema } from "./CreateProductDTO.js";

export const UpdateProductSchema = CreateProductSchema.partial();

export type UpdateProductDTO = z.infer<typeof UpdateProductSchema>;
