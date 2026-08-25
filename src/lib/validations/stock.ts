import { z } from "zod";
import { listaPreciosCodTiendaSchema } from "@/lib/validations/common";

export const getControlStockParamsSchema = z.object({
  q: z.string().max(500).optional(),
  marca: z.string().max(200).optional(),
  rubro: z.string().max(200).optional(),
  soloNegativo: z.boolean().optional(),
  orden: z.string().max(64).optional(),
  pagina: z.preprocess(
    (v) => (v === undefined || v === null || v === "" ? undefined : v),
    z.coerce.number().int().min(1).max(10_000).optional()
  ),
});

/** Un ítem con variación → PUT DUX (usuario, sucursal, cod_tienda, cantidad contada). */
export const pruebaPutAjusteStockDuxSchema = z.object({
  sucursal: z.enum(["guaymallen", "maipu"]),
  usuario: z.number().int().positive(),
  codTienda: listaPreciosCodTiendaSchema,
  stock: z.number().finite(),
});
