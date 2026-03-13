import { z } from "zod";

const uuidSchema = z.string().uuid("ID inválido.");

/** Campos editables de un producto (mock/ futuro). */
export const camposEditablesProductoSchema = z.object({
  descuentoRubro: z.number().min(0).max(100).optional(),
  descuentoCantidad: z.number().min(0).max(100).optional(),
  cxTransporte: z.number().min(0).optional(),
  disponible: z.boolean().optional(),
});

export type CamposEditablesInput = z.infer<typeof camposEditablesProductoSchema>;

export const editarProductoSchema = z.object({
  id: uuidSchema,
  campos: camposEditablesProductoSchema.refine(
    (c) => Object.keys(c).length > 0,
    "Al menos un campo debe enviarse."
  ),
});

export const campoMasivoSchema = z.enum([
  "descuentoRubro",
  "descuentoCantidad",
  "cxTransporte",
  "disponible",
]);

export type CampoMasivoInput = z.infer<typeof campoMasivoSchema>;

export const aplicarCampoMasivoSchema = z.object({
  proveedorId: uuidSchema,
  campo: campoMasivoSchema,
  valor: z.union([z.number(), z.boolean()]),
  q: z.string().optional(),
});
