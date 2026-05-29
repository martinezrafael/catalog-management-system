import { z } from "zod";

export const CreateCategorySchema = z.object({
  name: z.string({ message: "O nome da categoria é obrigatório." }),
});

export type CreateCategoryDTO = z.infer<typeof CreateCategorySchema>;
