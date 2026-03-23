import { z } from "zod";

export const proveedoresPageParamsSchema = z.object({
  q: z.string().max(500).optional(),
  proveedor: z.string().max(128).optional(),
  pagina: z.string().max(20).optional(),
});
