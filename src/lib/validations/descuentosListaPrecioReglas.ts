import { z } from "zod";

import { prismaCuidSchema } from "@/lib/validations/common";
import { porcentajeListaPreciosSchema } from "@/lib/validations/listaPrecios";

/** Campos materializables gobernados por reglas (columnas prod_precios_provee). */
export const campoReglaDescuentoListaPrecioSchema = z.enum([
  "dto_proveedor",
  "dto_marca",
  "dto_rubro",
  "dto_cantidad",
  "dto_financiero",
  "cx_transporte",
]);

export type CampoReglaDescuentoListaPrecioInput = z.infer<
  typeof campoReglaDescuentoListaPrecioSchema
>;

function refineAlMenosUnaCondicion(
  val: {
    idProveedor?: string | null;
    idMarca?: string | null;
    idRubro?: string | null;
  },
  ctx: z.RefinementCtx
): void {
  const tieneCondicion =
    val.idProveedor != null || val.idMarca != null || val.idRubro != null;
  if (!tieneCondicion) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Al menos una condición (proveedor, marca o rubro) es obligatoria.",
      path: ["idProveedor"],
    });
  }
}

export const crearReglaDescuentoListaPrecioSchema = z
  .object({
    campo: campoReglaDescuentoListaPrecioSchema,
    valor: porcentajeListaPreciosSchema,
    idProveedor: prismaCuidSchema.nullable().optional(),
    idMarca: prismaCuidSchema.nullable().optional(),
    idRubro: prismaCuidSchema.nullable().optional(),
  })
  .superRefine(refineAlMenosUnaCondicion);

export type CrearReglaDescuentoListaPrecioInput = z.infer<
  typeof crearReglaDescuentoListaPrecioSchema
>;

export const actualizarReglaDescuentoListaPrecioSchema = z
  .object({
    id: prismaCuidSchema,
    campo: campoReglaDescuentoListaPrecioSchema,
    valor: porcentajeListaPreciosSchema,
    idProveedor: prismaCuidSchema.nullable().optional(),
    idMarca: prismaCuidSchema.nullable().optional(),
    idRubro: prismaCuidSchema.nullable().optional(),
  })
  .superRefine(refineAlMenosUnaCondicion);

export type ActualizarReglaDescuentoListaPrecioInput = z.infer<
  typeof actualizarReglaDescuentoListaPrecioSchema
>;

export const eliminarReglaDescuentoListaPrecioSchema = z.object({
  id: prismaCuidSchema,
});

export type EliminarReglaDescuentoListaPrecioInput = z.infer<
  typeof eliminarReglaDescuentoListaPrecioSchema
>;
