-- Cambia la regla de unicidad del catálogo `fin_bal_gasto`:
--
--   ANTES : UNIQUE (rubro_id, nombre)
--           → el mismo `nombre` NO puede repetirse dentro de un rubro.
--
--   AHORA : el `nombre` SÍ puede repetirse dentro de un rubro siempre que el
--           `proveedor` sea distinto. Casos:
--
--     (rubro, nombre, prov=X)  +  (rubro, nombre, prov=Y)   → ✅ OK
--     (rubro, nombre, prov=X)  +  (rubro, nombre, prov=X)   → ❌ duplicado
--     (rubro, nombre, prov=Ø)  +  (rubro, nombre, prov=Ø)   → ❌ duplicado
--     (rubro, nombre, prov=Ø)  +  (rubro, nombre, prov=X)   → ✅ OK
--
-- Implementación:
--   1) UNIQUE compuesto `(rubro_id, nombre, proveedor_id)` — declarado también
--      en Prisma como `@@unique([rubroId, nombre, proveedorId])`. PostgreSQL
--      trata NULL como "no comparable", por lo que este índice por sí solo NO
--      cubre el último caso prohibido (dos filas con proveedor NULL).
--   2) UNIQUE parcial `WHERE proveedor_id IS NULL` — complementa (1) para
--      bloquear duplicados "sin proveedor" dentro del mismo rubro. Este índice
--      NO está declarado en Prisma (no hay sintaxis portable para índices
--      parciales ni `NULLS NOT DISTINCT` en la versión actual); vive solo en
--      SQL y el schema.prisma lo documenta por comentario.
--
-- Compatibilidad de datos:
--   El constraint anterior `(rubro_id, nombre)` era más restrictivo que el
--   nuevo, por lo que todos los registros existentes lo cumplen → ningún
--   backfill ni deduplicación necesaria.

-- 1) Reemplazar el UNIQUE anterior por el nuevo triple.
ALTER TABLE "fin_bal_gasto"
    DROP CONSTRAINT IF EXISTS "fin_bal_gasto_rubro_nombre_ux";

DROP INDEX IF EXISTS "fin_bal_gasto_rubro_nombre_ux";

CREATE UNIQUE INDEX "fin_bal_gasto_rubro_nombre_proveedor_ux"
    ON "fin_bal_gasto" ("rubro_id", "nombre", "proveedor_id");

-- 2) UNIQUE parcial que cubre el caso `proveedor_id IS NULL`.
--    Sin este índice, dos gastos con el mismo (rubro, nombre) y ambos sin
--    proveedor coexistirían (NULL ≠ NULL para UNIQUE estándar).
CREATE UNIQUE INDEX "fin_bal_gasto_rubro_nombre_sin_prov_ux"
    ON "fin_bal_gasto" ("rubro_id", "nombre")
    WHERE "proveedor_id" IS NULL;
