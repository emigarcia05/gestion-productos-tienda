import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const nombreEsSchema = z
  .string()
  .trim()
  .min(1, "Ingresá el nombre en español.")
  .max(200, "El nombre en español es demasiado largo.");

const nombreEnSchema = z
  .string()
  .trim()
  .min(1, "Ingresá el nombre en inglés.")
  .max(200, "El nombre en inglés es demasiado largo.");

export const crearProdIaDisenoCatalogoNombreSchema = z.object({
  nombre: nombreEsSchema,
  nombreEn: nombreEnSchema,
});

export const editarProdIaDisenoCatalogoNombreSchema = z.object({
  id: prismaCuidSchema,
  nombre: nombreEsSchema,
  nombreEn: nombreEnSchema,
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
