import { z } from "zod";
import { listaPreciosCodTiendaSchema } from "@/lib/validations/common";

export const setProductoPropioTiendaSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  esProductoPropio: z.boolean(),
});
