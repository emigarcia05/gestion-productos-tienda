import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const terminacionEstPorProdSchema = z
  .string()
  .trim()
  .min(1, "Ingresá una terminación.")
  .max(200, "La terminación es demasiado larga.");

export const crearEstPorProdTerminacionSchema = z.object({
  terminacion: terminacionEstPorProdSchema,
});

export const editarEstPorProdTerminacionSchema = z.object({
  id: prismaCuidSchema,
  terminacion: terminacionEstPorProdSchema,
});

export const eliminarEstPorProdTerminacionSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearEstPorProdTerminacionInput = z.infer<
  typeof crearEstPorProdTerminacionSchema
>;
export type EditarEstPorProdTerminacionInput = z.infer<
  typeof editarEstPorProdTerminacionSchema
>;
export type EliminarEstPorProdTerminacionInput = z.infer<
  typeof eliminarEstPorProdTerminacionSchema
>;
