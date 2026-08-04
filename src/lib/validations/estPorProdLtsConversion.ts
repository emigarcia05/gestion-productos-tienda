import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const textoEstPorProdLtsConversionSchema = z
  .string()
  .trim()
  .min(1, "Ingresá el texto a buscar en la descripción.")
  .max(200, "El texto es demasiado largo.");

/** Acepta número o string con coma/punto decimal (p. ej. «0,4» / «0.4»). */
function parseConversionLts(value: unknown): unknown {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!normalized) return value;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : value;
}

const conversionLtsSchema = z.preprocess(
  parseConversionLts,
  z
    .number({ error: "Ingresá la conversión en litros." })
    .finite("La conversión debe ser un número válido.")
    .min(0, "La conversión no puede ser negativa.")
    .max(100_000, "La conversión es demasiado grande.")
);

export const crearEstPorProdLtsConversionSchema = z.object({
  texto: textoEstPorProdLtsConversionSchema,
  conversionLts: conversionLtsSchema,
});

export const editarEstPorProdLtsConversionSchema = z.object({
  id: prismaCuidSchema,
  texto: textoEstPorProdLtsConversionSchema,
  conversionLts: conversionLtsSchema,
});

export const eliminarEstPorProdLtsConversionSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearEstPorProdLtsConversionInput = z.infer<
  typeof crearEstPorProdLtsConversionSchema
>;
export type EditarEstPorProdLtsConversionInput = z.infer<
  typeof editarEstPorProdLtsConversionSchema
>;
export type EliminarEstPorProdLtsConversionInput = z.infer<
  typeof eliminarEstPorProdLtsConversionSchema
>;
