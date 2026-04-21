import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

export const mesAnioQuerySchema = z.object({
  mes: z.coerce.number().int().min(1).max(12),
  anio: z.coerce.number().int().min(2000).max(2100),
});
export type MesAnioQuery = z.infer<typeof mesAnioQuerySchema>;

export const cargarImputacionesMesParamsSchema = mesAnioQuerySchema;
export type CargarImputacionesMesParams = z.infer<typeof cargarImputacionesMesParamsSchema>;

export const editarMontoFinBalGastoMensualSchema = z.object({
  id: prismaCuidSchema,
  monto: z.coerce.number().int().min(0, "El monto no puede ser negativo."),
});
export type EditarMontoFinBalGastoMensualInput = z.infer<typeof editarMontoFinBalGastoMensualSchema>;

export const eliminarFinBalGastoMensualSchema = z.object({
  id: prismaCuidSchema,
});
export type EliminarFinBalGastoMensualInput = z.infer<typeof eliminarFinBalGastoMensualSchema>;

export const obtenerMontoMesAnteriorSchema = z.object({
  gastoFinalId: prismaCuidSchema,
  mes: z.coerce.number().int().min(1).max(12),
  anio: z.coerce.number().int().min(2000).max(2100),
});
export type ObtenerMontoMesAnteriorInput = z.infer<typeof obtenerMontoMesAnteriorSchema>;
