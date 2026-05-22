import { z } from "zod";
import {
  CX_PROD_SELECCION_PROM,
  VINC_COSTO_MAS,
  VINC_COSTO_SIN,
  VINC_COSTO_UNO,
} from "@/lib/cxPxTienda";

export const getCxPxTiendaPageParamsSchema = z.object({
  q: z.string().max(500).optional(),
  rubro: z.string().max(200).optional(),
  subRubro: z.string().max(200).optional(),
  marca: z.string().max(200).optional(),
  /** `sin` | `uno` | `mas` — cantidad de proveedores vinculados (habilitados). */
  vincCosto: z
    .union([z.literal(VINC_COSTO_SIN), z.literal(VINC_COSTO_UNO), z.literal(VINC_COSTO_MAS)])
    .optional(),
  /** `prom` = Cx. Prom. (sin FK costo); si no, `id` de proveedor con al menos un vínculo. */
  costoProv: z.union([z.literal(CX_PROD_SELECCION_PROM), z.string().min(1).max(128)]).optional(),
  pagina: z.string().max(20).optional(),
});
