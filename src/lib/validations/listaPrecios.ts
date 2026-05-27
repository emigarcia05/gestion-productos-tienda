import { z } from "zod";

/** Lista no vacía de `cod_ext` para edición masiva en `prod_precios_provee`. */
export { listaPreciosCodExtListSchema } from "@/lib/validations/common";

/** Campos permitidos en actualización masiva de lista de precios. */
export const actualizacionMasivaListaPreciosSchema = z.object({
  marca: z.string().nullable().optional(),
  rubro: z.string().nullable().optional(),
  dtoProveedor: z.number().min(0).max(100).optional(),
  dtoMarca: z.number().min(0).max(100).optional(),
  dtoRubro: z.number().min(0).max(100).optional(),
  dtoCantidad: z.number().min(0).max(100).optional(),
  dtoFinanciero: z.number().min(0).max(100).optional(),
  cxTransporte: z.number().min(0).max(100).optional(),
  cotizacionDolar: z.number().positive().optional(),
  /** Precio de lista del proveedor (`prod_precios_provee.px_lista_proveedor`). */
  pxListaProveedor: z.number().min(0).optional(),
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
  proveedorId: z.string().max(128).optional(),
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
