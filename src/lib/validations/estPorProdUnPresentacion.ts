import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const unidadSchema = z
  .string()
  .trim()
  .min(1, "Ingresá la unidad.")
  .max(40, "La unidad es demasiado larga.");

export const estPorProdPosicionUnidadSchema = z.enum(["PREFIJO", "SUFIJO"]);

export const crearEstPorProdUnPresentacionSchema = z.object({
  unidad: unidadSchema,
  posicionUnidad: estPorProdPosicionUnidadSchema,
  suma: z.boolean(),
});

export const editarEstPorProdUnPresentacionSchema = z.object({
  id: prismaCuidSchema,
  unidad: unidadSchema,
  posicionUnidad: estPorProdPosicionUnidadSchema,
  suma: z.boolean(),
});

export const eliminarEstPorProdUnPresentacionSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearEstPorProdUnPresentacionInput = z.infer<
  typeof crearEstPorProdUnPresentacionSchema
>;
export type EditarEstPorProdUnPresentacionInput = z.infer<
  typeof editarEstPorProdUnPresentacionSchema
>;
export type EliminarEstPorProdUnPresentacionInput = z.infer<
  typeof eliminarEstPorProdUnPresentacionSchema
>;
