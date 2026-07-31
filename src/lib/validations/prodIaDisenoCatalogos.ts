import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const nombreSchema = z
  .string()
  .trim()
  .min(1, "Ingresá el nombre.")
  .max(200, "El nombre es demasiado largo.");

const textoSchema = z
  .string()
  .trim()
  .min(1, "Ingresá el texto para el prompt.")
  .max(500, "El texto es demasiado largo.");

export const crearProdIaDisenoCatalogoNombreSchema = z.object({
  nombre: nombreSchema,
  texto: textoSchema,
});

export const editarProdIaDisenoCatalogoNombreSchema = z.object({
  id: prismaCuidSchema,
  nombre: nombreSchema,
  texto: textoSchema,
});

export const eliminarProdIaDisenoCatalogoNombreSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearProdIaDisenoCatalogoNombreInput = z.infer<
  typeof crearProdIaDisenoCatalogoNombreSchema
>;
export type EditarProdIaDisenoCatalogoNombreInput = z.infer<
  typeof editarProdIaDisenoCatalogoNombreSchema
>;
export type EliminarProdIaDisenoCatalogoNombreInput = z.infer<
  typeof eliminarProdIaDisenoCatalogoNombreSchema
>;
