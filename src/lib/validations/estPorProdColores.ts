import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const nombreEstPorProdColorSchema = z
  .string()
  .trim()
  .min(1, "Ingresá un nombre de color.")
  .max(200, "El nombre es demasiado largo.");

export const crearEstPorProdColorSchema = z.object({
  nombre: nombreEstPorProdColorSchema,
});

export const editarEstPorProdColorSchema = z.object({
  id: prismaCuidSchema,
  nombre: nombreEstPorProdColorSchema,
});

export const eliminarEstPorProdColorSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearEstPorProdColorInput = z.infer<typeof crearEstPorProdColorSchema>;
export type EditarEstPorProdColorInput = z.infer<typeof editarEstPorProdColorSchema>;
export type EliminarEstPorProdColorInput = z.infer<typeof eliminarEstPorProdColorSchema>;
