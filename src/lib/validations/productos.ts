import { z } from "zod";

const uuidSchema = z.string().uuid("ID inválido.");

/** IDs de producto en flujos mock o futuros registros con identificador string acotado. */
const productoIdSchema = z.string().min(1).max(128);

/** Campos editables de un producto (mock/ futuro). */
export const camposEditablesProductoSchema = z.object({
  descuentoRubro: z.number().min(0).max(100).optional(),
  descuentoCantidad: z.number().min(0).max(100).optional(),
  cxTransporte: z.number().min(0).optional(),
  disponible: z.boolean().optional(),
});

export type CamposEditablesInput = z.infer<typeof camposEditablesProductoSchema>;

export const editarProductoSchema = z.object({
  id: productoIdSchema,
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
  proveedorId: z.string().cuid("ID de proveedor inválido."),
  campo: campoMasivoSchema,
  valor: z.union([z.number(), z.boolean()]),
  q: z.string().optional(),
});
