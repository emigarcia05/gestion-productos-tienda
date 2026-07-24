import { z } from "zod";
import { prismaCuidOrUuidSchema } from "@/lib/validations/common";
import {
  FIN_ANA_MC_CATEGORIA_PCT_MAX,
  FIN_ANA_MC_CATEGORIA_PCT_MIN,
} from "@/lib/finAnaMcCategorias";

const nombreCategoriaMcSchema = z
  .string()
  .trim()
  .min(1, "Ingresá una categoría.")
  .max(80, "El nombre es demasiado largo.");

const pctEnteroSchema = z
  .number()
  .int("El porcentaje debe ser entero.")
  .min(FIN_ANA_MC_CATEGORIA_PCT_MIN)
  .max(FIN_ANA_MC_CATEGORIA_PCT_MAX);

export const crearFinAnaMcCategoriaSchema = z
  .object({
    categoria: nombreCategoriaMcSchema,
    desdePct: pctEnteroSchema,
    hastaPct: pctEnteroSchema,
  })
  .refine((v) => v.desdePct < v.hastaPct, {
    message: "El límite inferior debe ser menor que el superior.",
    path: ["hastaPct"],
  });

export const editarFinAnaMcCategoriaSchema = z
  .object({
    id: prismaCuidOrUuidSchema,
    categoria: nombreCategoriaMcSchema,
    desdePct: pctEnteroSchema,
    hastaPct: pctEnteroSchema,
  })
  .refine((v) => v.desdePct < v.hastaPct, {
    message: "El límite inferior debe ser menor que el superior.",
    path: ["hastaPct"],
  });

export const eliminarFinAnaMcCategoriaSchema = z.object({
  id: prismaCuidOrUuidSchema,
});

export const reemplazarFinAnaMcCategoriasSchema = z.object({
  categorias: z
    .array(
      z
        .object({
          categoria: nombreCategoriaMcSchema,
          desdePct: pctEnteroSchema,
          hastaPct: pctEnteroSchema,
        })
        .refine((v) => v.desdePct < v.hastaPct, {
          message: "El límite inferior debe ser menor que el superior.",
          path: ["hastaPct"],
        })
    )
    .min(1, "Ingresá al menos una categoría."),
});

export type CrearFinAnaMcCategoriaInput = z.infer<
  typeof crearFinAnaMcCategoriaSchema
>;
export type EditarFinAnaMcCategoriaInput = z.infer<
  typeof editarFinAnaMcCategoriaSchema
>;
export type EliminarFinAnaMcCategoriaInput = z.infer<
  typeof eliminarFinAnaMcCategoriaSchema
>;
export type ReemplazarFinAnaMcCategoriasInput = z.infer<
  typeof reemplazarFinAnaMcCategoriasSchema
>;
