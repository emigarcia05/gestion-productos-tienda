import { z } from "zod";

export const uuidSchema = z.string().uuid("ID inválido.");
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
    idProductoReferencia: uuidSchema.nullable().optional(),
  }),
});

export const asignarProductosSchema = z.object({
  presentacionId: comparacionIdSchema,
  idsProductos: z.array(uuidSchema),
});

export const idsProductosSchema = z.array(uuidSchema);

/** Solo presentacionId para lectura. */
export const presentacionIdSchema = comparacionIdSchema;

export const actualizarDtoExtraComparacionSchema = z.object({
  listaPrecioProveedorId: uuidSchema,
  dtoExtra: z.number().int().min(0).max(99).nullable(),
});
