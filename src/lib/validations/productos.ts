import { z } from "zod";
import { listaPreciosCodExtSchema } from "@/lib/validations/common";

/** Campos editables inline en `/proveedores` (descuentos gobernados por motor de reglas). */
export const camposEditablesProductoSchema = z.object({
  disponible: z.boolean().optional(),
});

export type CamposEditablesInput = z.infer<typeof camposEditablesProductoSchema>;

export const editarProductoSchema = z.object({
  id: listaPreciosCodExtSchema,
  campos: camposEditablesProductoSchema.refine(
    (c) => Object.keys(c).length > 0,
    "Al menos un campo debe enviarse."
  ),
});

export const campoMasivoSchema = z.enum(["disponible"]);

export type CampoMasivoInput = z.infer<typeof campoMasivoSchema>;

export const aplicarCampoMasivoSchema = z.object({
  proveedorId: z.string().cuid("ID de proveedor inválido."),
  campo: campoMasivoSchema,
  valor: z.union([z.number(), z.boolean()]),
  q: z.string().optional(),
});
