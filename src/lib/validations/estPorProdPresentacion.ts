import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

/**
 * Validación de filas de `est_por_prod_presentacion`.
 * `texto` se deriva en el servicio (presentacion_numerica + unidad medida) y no se pide al cliente.
 */

/** Acepta número o string con coma/punto decimal (p. ej. «0,4» / «0.4»). */
function parseNumeroPresentacion(value: unknown): unknown {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!normalized) return value;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : value;
}

const numeroPresentacionSchema = z.preprocess(
  parseNumeroPresentacion,
  z
    .number({ error: "Ingresá un número válido." })
    .finite("El valor debe ser un número válido.")
    .min(0, "El valor no puede ser negativo.")
    .max(100_000_000, "El valor es demasiado grande.")
);

export const crearEstPorProdPresentacionSchema = z.object({
  unidadMedidaId: prismaCuidSchema,
  presentacionNumerica: numeroPresentacionSchema,
  conversionAUnidadId: prismaCuidSchema,
  conversionAUnidadPresentacion: numeroPresentacionSchema,
});

export const editarEstPorProdPresentacionSchema = z.object({
  id: prismaCuidSchema,
  unidadMedidaId: prismaCuidSchema,
  presentacionNumerica: numeroPresentacionSchema,
  conversionAUnidadId: prismaCuidSchema,
  conversionAUnidadPresentacion: numeroPresentacionSchema,
});

export const eliminarEstPorProdPresentacionSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearEstPorProdPresentacionInput = z.infer<
  typeof crearEstPorProdPresentacionSchema
>;
export type EditarEstPorProdPresentacionInput = z.infer<
  typeof editarEstPorProdPresentacionSchema
>;
export type EliminarEstPorProdPresentacionInput = z.infer<
  typeof eliminarEstPorProdPresentacionSchema
>;
