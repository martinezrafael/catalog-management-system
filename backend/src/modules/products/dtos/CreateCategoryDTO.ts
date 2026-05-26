import { z } from "zod";

export const CreateCategorySchema = z.object({
  name: z
    .string({ message: "Category name is required" })
    .min(1, "Category name cannot be empty")
    .max(255, "Category name too long"),
});

export type CreateCategoryDTO = z.infer<typeof CreateCategorySchema>;
