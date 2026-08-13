import { z } from "zod";

import {
  listaPreciosCodExtListSchema,
  prismaIdOptionalNullableSchema,
  prismaIdSchema,
} from "@/lib/validations/common";
import { porcentajeListaPreciosSchema } from "@/lib/validations/listaPrecios";

function refineAlMenosUnFiltroCategoria(
  val: {
    idProveedor?: string | null;
    idMarca?: string | null;
    idRubro?: string | null;
  },
  ctx: z.RefinementCtx
): void {
  const tieneFiltro =
    val.idProveedor != null || val.idMarca != null || val.idRubro != null;
  if (!tieneFiltro) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Seleccioná al menos un filtro (proveedor, marca o rubro).",
      path: ["idProveedor"],
    });
  }
}

const reglaDescEspecialFiltrosSchema = z.object({
  idProveedor: prismaIdOptionalNullableSchema,
  idMarca: prismaIdOptionalNullableSchema,
  idRubro: prismaIdOptionalNullableSchema,
});

export const crearReglaDescEspecialSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, "El nombre es obligatorio.")
      .max(200)
      .transform((value) => value.toUpperCase()),
    valor: porcentajeListaPreciosSchema,
    codigosExt: listaPreciosCodExtListSchema.min(
      1,
      "Seleccioná al menos un producto."
    ),
  })
  .merge(reglaDescEspecialFiltrosSchema)
  .superRefine(refineAlMenosUnFiltroCategoria);

export type CrearReglaDescEspecialInput = z.infer<typeof crearReglaDescEspecialSchema>;

export const actualizarReglaDescEspecialSchema = z
  .object({
    id: prismaIdSchema,
    nombre: z
      .string()
      .trim()
      .min(1, "El nombre es obligatorio.")
      .max(200)
      .transform((value) => value.toUpperCase()),
    valor: porcentajeListaPreciosSchema,
    codigosExt: listaPreciosCodExtListSchema.min(
      1,
      "Seleccioná al menos un producto."
    ),
  })
  .merge(reglaDescEspecialFiltrosSchema)
  .superRefine(refineAlMenosUnFiltroCategoria);

export type ActualizarReglaDescEspecialInput = z.infer<typeof actualizarReglaDescEspecialSchema>;

export const eliminarReglaDescEspecialSchema = z.object({
  id: prismaIdSchema,
});

export type EliminarReglaDescEspecialInput = z.infer<typeof eliminarReglaDescEspecialSchema>;

export const obtenerReglaDescEspecialDetalleSchema = z.object({
  id: prismaIdSchema,
});
