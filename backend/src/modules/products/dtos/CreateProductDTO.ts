import { z } from "zod";

export const CreateProductSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  description: z.string().optional(),
  sku: z
    .string()
    .regex(
      /^[A-Z]{3}-\d{4}-[A-Z0-9]{2}$/,
      "Formato de SKU inválido. Deve seguir o padrão AAA-1111-AA",
    ),
  price_cents: z
    .number()
    .int()
    .nonnegative("O preço deve ser um número inteiro positivo em centavos"),
  category_ids: z
    .array(z.number())
    .min(1, "Ao menos uma categoria é obrigatória"),
  attributes: z.record(z.string(), z.any()).default({}),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
