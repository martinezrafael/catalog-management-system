import { z } from "zod";
import { portugueseErrorMap } from "../../../shared/infra/http/zodErrorMap.js";

export const IdParamSchema = z.object(
  {
    id: z.coerce.number().int().positive(),
  },
  {
    error: portugueseErrorMap as any,
  },
);

export type IdParamDTO = z.infer<typeof IdParamSchema>;
