import { z } from "zod";
import { listaPreciosCodTiendaSchema } from "@/lib/validations/common";

/** Un ítem Act. Cx. → PUT DUX (`id_personal` + `cod_tienda`). */
export const pruebaPutCostoCxDuxSchema = z.object({
  usuario: z.number().int().positive(),
  codTienda: listaPreciosCodTiendaSchema,
});
