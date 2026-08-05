import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const textoSchema = z
  .string()
  .trim()
  .min(1, "Ingresá el texto a buscar en la descripción.")
  .max(200, "El texto es demasiado largo.");

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
  texto: textoSchema,
  unidadMedidaId: prismaCuidSchema,
  presentacionNumerica: numeroPresentacionSchema,
  conversionAUnidadId: prismaCuidSchema,
  conversionAUnidadPresentacion: numeroPresentacionSchema,
});

export const editarEstPorProdPresentacionSchema = z.object({
  id: prismaCuidSchema,
  texto: textoSchema,
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
