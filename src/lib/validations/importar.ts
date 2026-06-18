import { z } from "zod";

/** IDs de Prisma (`cuid` u otros string id). */
const prismaIdSchema = z.string().min(1).max(128);

const indiceColumnaSchema = z.string().regex(/^\d+$/, "Índice de columna inválido.");

export const campoDestinoProductoSchema = z.enum([
  "codProdProv",
  "descripcion",
  "precioLista",
  "precioVentaSugerido",
  "ignorar",
]);

export const mapeoColumnasProductoSchema = z.record(indiceColumnaSchema, campoDestinoProductoSchema);

export const importarProductosSchema = z.object({
  proveedorId: prismaIdSchema,
  filasCrudas: z.array(z.array(z.string().max(8000))).min(1).max(100_000),
  mapeo: mapeoColumnasProductoSchema,
});

export const campoDestinoListaPreciosSchema = z.enum([
  "codigoExterno",
  "codProdProv",
  "descripcion",
  "marca",
  "precioLista",
  "precioVentaSugerido",
  "ignorar",
]);

export const mapeoColumnasListaPreciosSchema = z.record(
  indiceColumnaSchema,
  campoDestinoListaPreciosSchema
);

export const importarListaPreciosProveedorSchema = z.object({
  proveedorId: prismaIdSchema,
  filasCrudas: z.array(z.array(z.string().max(8000))).min(1).max(100_000),
  mapeo: mapeoColumnasListaPreciosSchema,
  precioEnDolares: z.boolean().optional().default(false),
  habilitado: z.boolean().optional().default(true),
});
