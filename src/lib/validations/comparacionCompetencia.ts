import { z } from "zod";
import { listaPreciosCodTiendaSchema } from "@/lib/validations/common";

export const buscarProductosComparacionSchema = z.object({
  q: z.string().max(200).optional().default(""),
  take: z.coerce.number().int().min(1).max(500).optional().default(100),
});

export const codTiendaComparacionSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
});
