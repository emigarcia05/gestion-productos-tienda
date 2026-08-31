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

const sucursalControlStockSchema = z.enum(["guaymallen", "maipu"]);

const ajusteStockControlSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  cantidad: z.number().finite().min(-1_000_000).max(1_000_000),
});

/**
 * Exportar Excel: ÚLT. CONTROL + `prod_tienda_stock` del depósito de la sucursal
 * (solo ítems con variación en `ajustes`).
 */
export const registrarControlStockExportacionSchema = z
  .object({
    sucursal: sucursalControlStockSchema,
    idsControl: z.array(listaPreciosCodTiendaSchema).min(1).max(2000),
    ajustes: z.array(ajusteStockControlSchema).max(2000),
  })
  .superRefine((v, ctx) => {
    const ids = new Set(v.idsControl);
    for (const a of v.ajustes) {
      if (!ids.has(a.codTienda)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Hay ajustes fuera de los ítems controlados.",
          path: ["ajustes"],
        });
        return;
      }
    }
  });
