import { z } from "zod";

export const CreateProductSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  description: z.string().optional(),
  category_ids: z
    .array(z.number())
    .min(1, "Ao menos uma categoria é obrigatória"),
  attributes: z.record(z.string(), z.any()).default({}),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
