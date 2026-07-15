import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const cantidadSchema = z
  .number()
  .int("La cantidad debe ser un entero.")
  .min(1, "La cantidad mínima es 1.")
  .max(9999, "La cantidad es demasiado alta.");

export const crearMktPublicacionObjSchema = z.object({
  periodo: z.enum(["SEMANAL", "MENSUAL"]),
  eje: z.enum(["RED", "CONTENIDO", "SECCION"]),
  destinoId: prismaCuidSchema,
  cantidad: cantidadSchema,
});

export const editarMktPublicacionObjSchema = z.object({
  id: prismaCuidSchema,
  periodo: z.enum(["SEMANAL", "MENSUAL"]),
  cantidad: cantidadSchema,
});

export const eliminarMktPublicacionObjSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearMktPublicacionObjInput = z.infer<typeof crearMktPublicacionObjSchema>;
export type EditarMktPublicacionObjInput = z.infer<typeof editarMktPublicacionObjSchema>;
export type EliminarMktPublicacionObjInput = z.infer<typeof eliminarMktPublicacionObjSchema>;
