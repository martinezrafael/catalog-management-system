import { z } from "zod";

export const IdParamSchema = z.object({
  id: z.coerce.number(),
});

export type IdParamInput = z.infer<typeof IdParamSchema>;
