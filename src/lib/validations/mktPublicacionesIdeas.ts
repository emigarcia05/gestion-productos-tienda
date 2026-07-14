import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const ideaNombreSchema = z
  .string()
  .trim()
  .min(1, "Ingresá un nombre.")
  .max(200, "El nombre es demasiado largo.");

const ideaResumenSchema = z
  .string()
  .trim()
  .max(10000, "El resumen es demasiado largo.");

const detalleTextoSchema = z
  .string()
  .trim()
  .min(1, "Ingresá el detalle.")
  .max(10000, "El detalle es demasiado largo.");

const tituloIdeaSchema = z
  .string()
  .trim()
  .min(1, "Ingresá un título.")
  .max(200, "El título es demasiado largo.");

const idsCatalogoMinUnoSchema = z
  .array(prismaCuidSchema)
  .min(1, "Seleccioná al menos una opción.");

export const crearMktIdeaSeccionSchema = z.object({
  nombre: ideaNombreSchema,
  resumen: ideaResumenSchema,
});

export const editarMktIdeaSeccionSchema = z.object({
  id: prismaCuidSchema,
  nombre: ideaNombreSchema,
  resumen: ideaResumenSchema,
});

export const eliminarMktIdeaSeccionSchema = z.object({
  id: prismaCuidSchema,
});

/** Alta: `usada` siempre NO en servicio (no se acepta desde el cliente). */
export const crearMktIdeaDetalleSchema = z.object({
  seccionId: prismaCuidSchema,
  tituloIdea: tituloIdeaSchema,
  detalle: detalleTextoSchema,
  redIds: idsCatalogoMinUnoSchema,
  tipoPublicacionIds: idsCatalogoMinUnoSchema,
  tipoContenidoId: prismaCuidSchema,
});

export const editarMktIdeaDetalleSchema = z.object({
  id: prismaCuidSchema,
  tituloIdea: tituloIdeaSchema,
  detalle: detalleTextoSchema,
  redIds: idsCatalogoMinUnoSchema,
  tipoPublicacionIds: idsCatalogoMinUnoSchema,
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
