import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

export const proveedoresPageParamsSchema = z.object({
  q: z.string().max(500).optional(),
  proveedor: prismaCuidSchema.optional(),
  pagina: z.coerce.number().int().min(1).max(10_000).optional(),
});
