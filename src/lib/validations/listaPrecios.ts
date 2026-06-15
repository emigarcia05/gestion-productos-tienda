import { z } from "zod";

/** Lista no vacía de `cod_ext` para edición masiva en `prod_precios_provee`. */
export { listaPreciosCodExtListSchema } from "@/lib/validations/common";
import { prismaCuidSchema } from "@/lib/validations/common";

function tieneMaxDosDecimales(n: number): boolean {
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
}

/** Porcentaje 0–100 con hasta 2 decimales (`prod_precios_provee.dto_*`, `cx_transporte`). */
export const porcentajeListaPreciosSchema = z
  .number()
  .min(0)
  .max(100)
  .refine(tieneMaxDosDecimales, "El porcentaje admite hasta 2 decimales.");

/** Campos permitidos en actualización masiva de lista de precios. */
export const actualizacionMasivaListaPreciosSchema = z.object({
  marca: z.string().nullable().optional(),
  rubro: z.string().nullable().optional(),
  dtoProveedor: porcentajeListaPreciosSchema.optional(),
  dtoMarca: porcentajeListaPreciosSchema.optional(),
  dtoRubro: porcentajeListaPreciosSchema.optional(),
  dtoCantidad: porcentajeListaPreciosSchema.optional(),
  dtoFinanciero: porcentajeListaPreciosSchema.optional(),
  cxTransporte: porcentajeListaPreciosSchema.optional(),
  cotizacionDolar: z.number().min(0).optional(),
  /** Precio de lista del proveedor (`prod_precios_provee.px_lista_proveedor`). */
  pxListaProveedor: z.number().min(0).optional(),
  habilitado: z.boolean().optional(),
});

export type ActualizacionMasivaListaPreciosInput = z.infer<typeof actualizacionMasivaListaPreciosSchema>;

/** Opciones de filtro admitidas en listados de lista de precios (objeto estricto). */
export const listaPreciosOpcionesFiltroSchema = z
  .object({
    soloPxSugerido: z.boolean().optional(),
  })
  .strict();

/** Filtros de las Actions de lectura de lista de precios (anti abuso de strings largos). */
export const listaPreciosFiltrosLecturaSchema = z.object({
  proveedorId: prismaCuidSchema.optional(),
  marcaNombre: z.string().max(200).optional(),
  rubroNombre: z.string().max(200).optional(),
  busqueda: z.string().max(500).optional(),
  habilitado: z.boolean().optional(),
  opciones: listaPreciosOpcionesFiltroSchema.optional(),
  pagina: z.preprocess(
    (v) => (v === undefined || v === null || v === "" ? undefined : v),
    z.coerce.number().int().min(1).max(10_000).optional()
  ),
});

export type ListaPreciosFiltrosLecturaInput = z.infer<typeof listaPreciosFiltrosLecturaSchema>;
