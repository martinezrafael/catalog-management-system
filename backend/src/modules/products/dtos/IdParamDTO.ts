import { z } from "zod";

export const IdParamSchema = z.object({
  id: z.coerce
    .number({ message: "ID must be a number" })
    .int()
    .positive("ID must be a valid positive number"),
});

export type IdParamDTO = z.infer<typeof IdParamSchema>;
