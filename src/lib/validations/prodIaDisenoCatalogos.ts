import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const nombreCatalogoSchema = z
  .string()
  .trim()
  .min(1, "Ingresá un nombre.")
  .max(200, "El nombre es demasiado largo.");

export const crearProdIaDisenoCatalogoNombreSchema = z.object({
  nombre: nombreCatalogoSchema,
});

export const editarProdIaDisenoCatalogoNombreSchema = z.object({
  id: prismaCuidSchema,
  nombre: nombreCatalogoSchema,
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
