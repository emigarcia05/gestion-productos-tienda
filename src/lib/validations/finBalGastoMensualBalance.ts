import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

/** Periodo calendario para Balance · Gastos y acciones relacionadas (`fin_bal_gasto_mensual`). */
export const mesAnioQuerySchema = z.object({
  mes: z.coerce.number().int().min(1).max(12),
  anio: z.coerce.number().int().min(2026).max(2046),
});
export type MesAnioQuery = z.infer<typeof mesAnioQuerySchema>;

export const cargarImputacionesMesParamsSchema = mesAnioQuerySchema;
export type CargarImputacionesMesParams = z.infer<typeof cargarImputacionesMesParamsSchema>;

export const editarMontoFinBalGastoMensualSchema = z.object({
  id: prismaCuidSchema,
  monto: z.coerce.number().int().min(0, "El monto no puede ser negativo."),
});
export type EditarMontoFinBalGastoMensualInput = z.infer<typeof editarMontoFinBalGastoMensualSchema>;

export const registrarPagoFinBalGastoMensualSchema = z.object({
  id: prismaCuidSchema,
  pagado: z.coerce.number().int().min(0, "El importe pagado no puede ser negativo."),
});
export type RegistrarPagoFinBalGastoMensualInput = z.infer<typeof registrarPagoFinBalGastoMensualSchema>;

export const eliminarFinBalGastoMensualSchema = z.object({
  id: prismaCuidSchema,
});
export type EliminarFinBalGastoMensualInput = z.infer<typeof eliminarFinBalGastoMensualSchema>;

export const obtenerMontoMesAnteriorSchema = z.object({
  gastoFinalId: prismaCuidSchema,
  mes: z.coerce.number().int().min(1).max(12),
  anio: z.coerce.number().int().min(2026).max(2046),
});
export type ObtenerMontoMesAnteriorInput = z.infer<typeof obtenerMontoMesAnteriorSchema>;

export const listarGastosFinalesNoMensualesParamsSchema = mesAnioQuerySchema;
export type ListarGastosFinalesNoMensualesParams = z.infer<
  typeof listarGastosFinalesNoMensualesParamsSchema
>;

export const crearImputacionGastoUnicoBalanceSchema = z
  .object({
    gastoFinalId: prismaCuidSchema,
    mes: z.coerce.number().int().min(1).max(12),
    anio: z.coerce.number().int().min(2026).max(2046),
    monto: z.coerce.number().int().min(1, "El monto es obligatorio."),
    pagado: z.coerce.number().int().min(0).optional().default(0),
  })
  .refine((d) => d.pagado <= d.monto, {
    message: "El pagado no puede superar el monto.",
    path: ["pagado"],
  });
export type CrearImputacionGastoUnicoBalanceInput = z.infer<
  typeof crearImputacionGastoUnicoBalanceSchema
>;
