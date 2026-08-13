import { z } from "zod";

import { listaPreciosCodExtSchema } from "@/lib/validations/common";

export const comparacionIdSchema = z.string().cuid("ID inválido.");

export const nombreCategoriaSchema = z
  .string()
  .min(1, "El nombre es obligatorio.")
  .transform((s) => s.trim())
  .refine((s) => s.length >= 1, "El nombre no puede quedar vacío.");

export const createCategoriaSchema = z.object({ nombre: nombreCategoriaSchema });

export const updateCategoriaSchema = z.object({
  id: comparacionIdSchema,
  data: z.object({ nombre: z.string().min(1).optional() }),
});

export const createSubcategoriaSchema = z.object({
  categoriaId: comparacionIdSchema,
  nombre: nombreCategoriaSchema,
});

export const updateSubcategoriaSchema = z.object({
  id: comparacionIdSchema,
  data: z.object({
    nombre: z.string().min(1).optional(),
    categoriaId: comparacionIdSchema.optional(),
  }),
});

export const createPresentacionSchema = z.object({
  subcategoriaId: comparacionIdSchema,
  nombre: nombreCategoriaSchema,
  costoCompraObjetivo: z.number().positive().nullable().optional(),
});

export const updatePresentacionSchema = z.object({
  id: comparacionIdSchema,
  data: z.object({
    nombre: z.string().min(1).optional(),
    subcategoriaId: comparacionIdSchema.optional(),
    costoCompraObjetivo: z.number().positive().nullable().optional(),
  }),
});

export const asignarReferenciaCompetenciaSchema = z.object({
  presentacionId: comparacionIdSchema,
  codTienda: z.string().min(1, "Código tienda inválido."),
  competenciaId: comparacionIdSchema,
});

export const buscarReferenciaCompetenciaSchema = z.object({
  q: z.string().max(500).optional(),
  competenciaId: comparacionIdSchema.optional(),
  take: z.number().int().min(1).max(200).optional(),
  presentacionId: comparacionIdSchema.optional(),
});

export const quitarReferenciaCompetenciaItemSchema = z.object({
  refCompId: comparacionIdSchema,
});

export const asignarProductosSchema = z.object({
  presentacionId: comparacionIdSchema,
  idsProductos: z.array(listaPreciosCodExtSchema),
});

export const idsProductosSchema = z.array(listaPreciosCodExtSchema);

/** Solo presentacionId para lectura. */
export const presentacionIdSchema = comparacionIdSchema;

export const actualizarDtoExtraComparacionSchema = z.object({
  listaPrecioProveedorId: listaPreciosCodExtSchema,
  dtoExtra: z.number().int().min(0).max(99).nullable(),
});

export const actualizarDifPxRefManualComparacionSchema = z.object({
  listaPrecioProveedorId: listaPreciosCodExtSchema,
  difPxRefManual: z.number().int().nullable(),
});
