import { z } from "zod";
import { portugueseErrorMap } from "../../../shared/infra/http/zodErrorMap.js";

export const CreateProductSchema = z.object(
  {
    name: z.string(),
    description: z.string().optional(),
    sku: z.string().regex(/^[A-Z]{3}-\d{4}-[A-Z0-9]{2}$/),
    price_cents: z.number().int(),
    category_ids: z.array(z.number()),
    attributes: z.record(z.string(), z.any()).default({}),
  },
  {
    error: portugueseErrorMap as any,
  },
);

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
