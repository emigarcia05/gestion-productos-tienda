import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const nombreSchema = z
  .string()
  .trim()
  .min(1, "Ingresá un nombre.")
  .max(200, "El nombre es demasiado largo.");

const descripcionSchema = z
  .string()
  .trim()
  .max(10000, "La descripción es demasiado larga.");

const urlSchema = z
  .string()
  .trim()
  .min(1, "Ingresá la URL.")
  .max(2048, "La URL es demasiado larga.")
  .refine((s) => /^https?:\/\//i.test(s), "Ingresá una URL válida (http/https).");

export const crearMktContenidoUrlDriveSchema = z.object({
  nombre: nombreSchema,
  descripcion: descripcionSchema,
  url: urlSchema,
  tipoId: prismaCuidSchema,
});

export const editarMktContenidoUrlDriveSchema = z.object({
  id: prismaCuidSchema,
  nombre: nombreSchema,
  descripcion: descripcionSchema,
  url: urlSchema,
  tipoId: prismaCuidSchema,
});

export const eliminarMktContenidoUrlDriveSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearMktContenidoUrlDriveInput = z.infer<typeof crearMktContenidoUrlDriveSchema>;
export type EditarMktContenidoUrlDriveInput = z.infer<typeof editarMktContenidoUrlDriveSchema>;
export type EliminarMktContenidoUrlDriveInput = z.infer<typeof eliminarMktContenidoUrlDriveSchema>;
