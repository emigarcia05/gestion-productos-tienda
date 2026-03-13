import { z } from "zod";

/** UUIDs para listas de IDs en edición masiva. */
export const idsUuidSchema = z.array(z.string().uuid()).min(1, "Al menos un ID es requerido.");

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
});

export type ActualizacionMasivaListaPreciosInput = z.infer<typeof actualizacionMasivaListaPreciosSchema>;
