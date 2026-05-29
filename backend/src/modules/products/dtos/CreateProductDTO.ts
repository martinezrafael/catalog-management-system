import { z } from "zod";

export const CreateProductSchema = z.object({
  name: z.string({ message: "O nome do produto é obrigatório." }),
  description: z.string().optional(),
  sku: z.string().regex(/^[A-Z]{3}-\d{4}-[A-Z0-9]{2}$/),
  price_cents: z.number().int(),
  category_ids: z.array(z.number()),
  attributes: z.record(z.string(), z.any()).default({}),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
