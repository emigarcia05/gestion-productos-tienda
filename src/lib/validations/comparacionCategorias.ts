import { z } from "zod";

export const uuidSchema = z.string().uuid("ID inválido.");

export const nombreCategoriaSchema = z
  .string()
  .min(1, "El nombre es obligatorio.")
  .transform((s) => s.trim())
  .refine((s) => s.length >= 1, "El nombre no puede quedar vacío.");

export const createCategoriaSchema = z.object({ nombre: nombreCategoriaSchema });

export const updateCategoriaSchema = z.object({
  id: uuidSchema,
  data: z.object({ nombre: z.string().min(1).optional() }),
});

export const createSubcategoriaSchema = z.object({
  categoriaId: uuidSchema,
  nombre: nombreCategoriaSchema,
});

export const updateSubcategoriaSchema = z.object({
  id: uuidSchema,
  data: z.object({
    nombre: z.string().min(1).optional(),
    categoriaId: uuidSchema.optional(),
  }),
});

export const createPresentacionSchema = z.object({
  subcategoriaId: uuidSchema,
  nombre: nombreCategoriaSchema,
  costoCompraObjetivo: z.number().positive().nullable().optional(),
});

export const updatePresentacionSchema = z.object({
  id: uuidSchema,
  data: z.object({
    nombre: z.string().min(1).optional(),
    subcategoriaId: uuidSchema.optional(),
    costoCompraObjetivo: z.number().positive().nullable().optional(),
    idProductoReferencia: uuidSchema.nullable().optional(),
  }),
});

export const asignarProductosSchema = z.object({
  presentacionId: uuidSchema,
  idsProductos: z.array(uuidSchema),
});

export const idsProductosSchema = z.array(uuidSchema);

/** Solo presentacionId para lectura. */
export const presentacionIdSchema = uuidSchema;
