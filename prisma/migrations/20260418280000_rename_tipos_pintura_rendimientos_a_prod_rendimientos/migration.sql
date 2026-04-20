-- ============================================================================
-- Rename: `tipos_pintura_rendimientos`  ->  `prod_rendimientos`
--
-- Contexto:
--   Tabla de catálogo de rendimientos por tipo de pintura, consumida por
--   `/tienda/litros` (Cálculo de Lts). No está modelada en `schema.prisma`:
--   todas sus lecturas/escrituras van por raw SQL (`$queryRaw` / `$executeRaw`)
--   en `src/actions/tiposPinturaRendimientos.ts`. Por ese motivo esta migración
--   sólo necesita renames SQL — no hay `@@map(...)` ni modelo a ajustar.
--
--   El nombre TypeScript del action (`getTiposPinturaRendimientosAction`, etc.)
--   y el tipo `TipoPinturaRendimiento` se mantienen sin cambios: este rename
--   afecta únicamente la capa física en PostgreSQL.
--
-- Estructura existente en Neon (inspeccionada antes del rename):
--   * PK      : `tipos_pintura_rendimientos_pkey` (id uuid)
--   * UNIQUE  : `ux_tipos_pintura_rendimientos_tipo_lower`
--               ON (lower(tipo_pintura::text)) — case-insensitive
--   * CHECK   : `tipos_pintura_rendimientos_rendimiento_check`
--               (validación de dominio sobre `rendimiento`)
--   * Columnas: id, tipo_pintura, rendimiento, created_at, updated_at
--
-- Renames aplicados abajo: tabla + todas las constraints/índices al prefijo
-- `prod_rendimientos_*` / `ux_prod_rendimientos_*` para mantener consistencia
-- en logs, dumps y `db pull`.
--
-- Idempotente vía `IF EXISTS`.
-- Rollback: invertir cada `ALTER … RENAME TO …`.
-- ============================================================================

ALTER TABLE IF EXISTS "tipos_pintura_rendimientos" RENAME TO "prod_rendimientos";

ALTER INDEX IF EXISTS "tipos_pintura_rendimientos_pkey"
    RENAME TO "prod_rendimientos_pkey";

ALTER INDEX IF EXISTS "ux_tipos_pintura_rendimientos_tipo_lower"
    RENAME TO "ux_prod_rendimientos_tipo_lower";

ALTER TABLE IF EXISTS "prod_rendimientos"
    RENAME CONSTRAINT "tipos_pintura_rendimientos_rendimiento_check"
                  TO "prod_rendimientos_rendimiento_check";
