-- ============================================================================
-- Revert del rename `comprobantes_proveedor` -> `prod_comp_provee`
-- (aplicado en `20260418260000_rename_prod_comp_y_comprobantes`).
--
-- Motivación: el prefijo `prod_comp_*` debe quedar circunscripto al dominio
-- "Comparación por Categoría" (prod[ucto]_comp[aración]). `comprobantes_proveedor`
-- pertenece al dominio "Comprobantes DUX" (facturas/NC/ND sincronizadas desde
-- la API DUX `/compras`) y no debe compartir prefijo con tablas de comparación.
-- Los otros 4 renames de aquella migración (prod_comp_cat, prod_comp_sub_cat,
-- prod_comp_presentaciones, prod_comp_dto_extra) SE MANTIENEN.
--
-- Revierte en paralelo:
--   * Schema Prisma: `@@map("comprobantes_proveedor")` y `map: "comprobantes_proveedor_natural_ux"`.
--   * Raw SQL de servicios (`FROM prod_comp_provee` -> `FROM comprobantes_proveedor`).
--
-- Idempotente vía `IF EXISTS`: reintento seguro y tolerante al caso en que
-- alguna entidad ya hubiera sido revertida manualmente.
-- ============================================================================

ALTER TABLE IF EXISTS "prod_comp_provee" RENAME TO "comprobantes_proveedor";

ALTER INDEX IF EXISTS "prod_comp_provee_pkey"
    RENAME TO "comprobantes_proveedor_pkey";

-- UNIQUE con `map:` explícito en Prisma → el nombre DEBE volver a coincidir con
-- `@@unique(..., map: "comprobantes_proveedor_natural_ux")` en schema.prisma
-- para evitar drift en futuras `prisma migrate dev`.
ALTER INDEX IF EXISTS "prod_comp_provee_natural_ux"
    RENAME TO "comprobantes_proveedor_natural_ux";

ALTER INDEX IF EXISTS "prod_comp_provee_fecha_comp_idx"
    RENAME TO "comprobantes_proveedor_fecha_comp_idx";

ALTER INDEX IF EXISTS "prod_comp_provee_id_proveedor_idx"
    RENAME TO "comprobantes_proveedor_id_proveedor_idx";

ALTER TABLE IF EXISTS "comprobantes_proveedor"
    RENAME CONSTRAINT "prod_comp_provee_id_proveedor_fkey"
                  TO "comprobantes_proveedor_id_proveedor_fkey";
