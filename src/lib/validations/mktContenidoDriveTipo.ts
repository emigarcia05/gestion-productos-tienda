import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const tipoNombreSchema = z
  .string()
  .trim()
  .min(1, "Ingresá un tipo.")
  .max(200, "El tipo es demasiado largo.");

export const crearMktContenidoDriveTipoSchema = z.object({
  tipo: tipoNombreSchema,
});

export const editarMktContenidoDriveTipoSchema = z.object({
  id: prismaCuidSchema,
  tipo: tipoNombreSchema,
});

export const eliminarMktContenidoDriveTipoSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearMktContenidoDriveTipoInput = z.infer<typeof crearMktContenidoDriveTipoSchema>;
export type EditarMktContenidoDriveTipoInput = z.infer<typeof editarMktContenidoDriveTipoSchema>;
export type EliminarMktContenidoDriveTipoInput = z.infer<typeof eliminarMktContenidoDriveTipoSchema>;
