-- ════════════════════════════════════════════════════════════════════════════
-- Catálogo hoja Balance → Gastos:
--   1) Renombrar `fin_bal_gasto` → `fin_bal_cat_gasto`
--   2) Eliminar columnas `proveedor_id` y `gasto_mensual`
--   3) Reemplazar unicidad (rubro, nombre, proveedor) + parcial por
--      UNIQUE simple (rubro_id, nombre)
--
-- Si existían dos filas con el mismo rubro+nombre y distinto proveedor,
-- antes eran válidas; ahora solo puede quedar una. Se conserva la fila con
-- `id` lexicográficamente menor (CUID estable).
-- ════════════════════════════════════════════════════════════════════════════

-- Quitar índices/unicidad que usan proveedor_id
DROP INDEX IF EXISTS "fin_bal_gasto_rubro_nombre_sin_prov_ux";
DROP INDEX IF EXISTS "fin_bal_gasto_rubro_nombre_proveedor_ux";

-- FK e índice de proveedor
ALTER TABLE "fin_bal_gasto" DROP CONSTRAINT IF EXISTS "fin_bal_gasto_proveedor_id_fkey";
DROP INDEX IF EXISTS "fin_bal_gasto_proveedor_id_idx";

-- Columnas solicitadas
ALTER TABLE "fin_bal_gasto" DROP COLUMN IF EXISTS "proveedor_id";
ALTER TABLE "fin_bal_gasto" DROP COLUMN IF EXISTS "gasto_mensual";

-- Dedupe (rubro_id, nombre) antes del nuevo UNIQUE
DELETE FROM "fin_bal_gasto" a
WHERE EXISTS (
  SELECT 1
  FROM "fin_bal_gasto" b
  WHERE b.rubro_id = a.rubro_id
    AND b.nombre = a.nombre
    AND b.id < a.id
);

-- Renombrar tabla y objetos asociados
ALTER TABLE "fin_bal_gasto" RENAME TO "fin_bal_cat_gasto";

ALTER INDEX "fin_bal_gasto_pkey" RENAME TO "fin_bal_cat_gasto_pkey";

ALTER TABLE "fin_bal_cat_gasto"
  RENAME CONSTRAINT "fin_bal_gasto_rubro_id_fkey" TO "fin_bal_cat_gasto_rubro_id_fkey";

ALTER INDEX "fin_bal_gasto_rubro_id_idx" RENAME TO "fin_bal_cat_gasto_rubro_id_idx";

CREATE UNIQUE INDEX "fin_bal_cat_gasto_rubro_nombre_ux"
  ON "fin_bal_cat_gasto" ("rubro_id", "nombre");
