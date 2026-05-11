import { z } from "zod";

/** Un solo UUID (Prisma/crypto id). */
export const uuidSchema = z.string().uuid("ID inválido.");

/** ID `cuid()` típico de modelos como `Proveedor`. */
export const prismaCuidSchema = z.string().cuid("ID inválido.");

/**
 * FK string aceptada como **UUID** (filas legacy, p. ej. `global_sucursales.id`) o **CUID** (default Prisma).
 */
export const prismaCuidOrUuidSchema = z.union([
  z.string().uuid("ID inválido."),
  z.string().cuid("ID inválido."),
]);

/**
 * `global_sucursales.id`: CUID, UUID, o id fijo de seed **CORPORATIVO** (`suc_corporativo`, migración `20260418150000_seed_sucursal_corporativo`).
 */
export const globalSucursalIdSchema = z.union([
  z.string().uuid("ID inválido."),
  z.string().cuid("ID inválido."),
  z.literal("suc_corporativo"),
]);

/** Clave natural `prod_precios_provee.cod_ext`. */
export const listaPreciosCodExtSchema = z
  .string()
  .min(1, "Cód. externo inválido.")
  .max(200, "Cód. externo demasiado largo.");

/** Lista no vacía de `cod_ext` (p. ej. edición masiva lista proveedor). */
export const listaPreciosCodExtListSchema = z
  .array(listaPreciosCodExtSchema)
  .min(1, "Al menos un código es requerido.");

/** Clave natural `prod_precios_tienda.cod_tienda`. */
export const listaPreciosCodTiendaSchema = z
  .string()
  .min(1, "Cód. tienda inválido.")
  .max(200, "Cód. tienda demasiado largo.");

/** Lista de UUIDs (mínimo uno). */
export const uuidsSchema = z.array(uuidSchema).min(1, "Al menos un ID es requerido.");

/** Parámetros de paginación y filtros de texto (para acciones de listado). */
export const paramsPaginaSchema = z.object({
  q: z.string().optional().default(""),
  pagina: z.string().optional().default("1"),
});

export type ParamsPagina = z.infer<typeof paramsPaginaSchema>;
