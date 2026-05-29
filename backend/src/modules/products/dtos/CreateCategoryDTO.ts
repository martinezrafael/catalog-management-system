import { z } from "zod";
import { portugueseErrorMap } from "../../../shared/infra/http/zodErrorMap.js";

export const CreateCategorySchema = z.object(
  {
    name: z.string(),
  },
  {
    error: portugueseErrorMap as any,
  },
);

export type CreateCategoryDTO = z.infer<typeof CreateCategorySchema>;
