import { z } from "zod";

export const getTiendaPageParamsSchema = z.object({
  q: z.string().max(500).optional(),
  rubro: z.string().max(200).optional(),
  subRubro: z.string().max(200).optional(),
  marca: z.string().max(200).optional(),
  proveedor: z.string().max(200).optional(),
  /** Query `vinculado=no` | `vinculado=si` (mayúsculas/minúsculas); otro valor se ignora en la action. */
  vinculado: z.string().max(5).optional(),
  pagina: z.string().max(20).optional(),
});
