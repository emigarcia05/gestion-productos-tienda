import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const nombreMktCatalogoSchema = z
  .string()
  .trim()
  .min(1, "Ingresá un nombre.")
  .max(200, "El nombre es demasiado largo.");

export const crearMktCatalogoNombreSchema = z.object({
  nombre: nombreMktCatalogoSchema,
});

export const editarMktCatalogoNombreSchema = z.object({
  id: prismaCuidSchema,
  nombre: nombreMktCatalogoSchema,
});

export const eliminarMktCatalogoNombreSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearMktCatalogoNombreInput = z.infer<typeof crearMktCatalogoNombreSchema>;
export type EditarMktCatalogoNombreInput = z.infer<typeof editarMktCatalogoNombreSchema>;
export type EliminarMktCatalogoNombreInput = z.infer<typeof eliminarMktCatalogoNombreSchema>;
