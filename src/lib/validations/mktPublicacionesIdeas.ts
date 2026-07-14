import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const ideaNombreSchema = z
  .string()
  .trim()
  .min(1, "Ingresá un nombre.")
  .max(200, "El nombre es demasiado largo.");

const detalleTextoSchema = z
  .string()
  .trim()
  .min(1, "Ingresá el detalle.")
  .max(10000, "El detalle es demasiado largo.");

export const crearMktIdeaSeccionSchema = z.object({
  nombre: ideaNombreSchema,
});

export const editarMktIdeaSeccionSchema = z.object({
  id: prismaCuidSchema,
  nombre: ideaNombreSchema,
});

export const eliminarMktIdeaSeccionSchema = z.object({
  id: prismaCuidSchema,
});

/** Alta: `usada` siempre NO en servicio (no se acepta desde el cliente). */
export const crearMktIdeaDetalleSchema = z.object({
  seccionId: prismaCuidSchema,
  detalle: detalleTextoSchema,
  redId: prismaCuidSchema,
  tipoPublicacionId: prismaCuidSchema,
  tipoContenidoId: prismaCuidSchema,
});

export const editarMktIdeaDetalleSchema = z.object({
  id: prismaCuidSchema,
  detalle: detalleTextoSchema,
  redId: prismaCuidSchema,
  tipoPublicacionId: prismaCuidSchema,
  tipoContenidoId: prismaCuidSchema,
  usada: z.boolean(),
});

export const eliminarMktIdeaDetalleSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearMktIdeaSeccionInput = z.infer<typeof crearMktIdeaSeccionSchema>;
export type EditarMktIdeaSeccionInput = z.infer<typeof editarMktIdeaSeccionSchema>;
export type EliminarMktIdeaSeccionInput = z.infer<typeof eliminarMktIdeaSeccionSchema>;
export type CrearMktIdeaDetalleInput = z.infer<typeof crearMktIdeaDetalleSchema>;
export type EditarMktIdeaDetalleInput = z.infer<typeof editarMktIdeaDetalleSchema>;
export type EliminarMktIdeaDetalleInput = z.infer<typeof eliminarMktIdeaDetalleSchema>;
