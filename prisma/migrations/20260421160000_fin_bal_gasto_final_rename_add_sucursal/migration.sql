-- `fin_bal_gasto_provee` → `fin_bal_gasto_final`
-- Columna `sucursal_id` → FK `global_sucursales`
-- UNIQUE (gasto_id, proveedor_id, sucursal_id)

ALTER TABLE "fin_bal_gasto_provee" ADD COLUMN IF NOT EXISTS "sucursal_id" TEXT;

UPDATE "fin_bal_gasto_provee" p
SET "sucursal_id" = COALESCE(
  (SELECT id FROM "global_sucursales" WHERE codigo = 'corporativo' LIMIT 1),
  (SELECT id FROM "global_sucursales" ORDER BY codigo LIMIT 1)
)
WHERE "sucursal_id" IS NULL;

ALTER TABLE "fin_bal_gasto_provee" ALTER COLUMN "sucursal_id" SET NOT NULL;

DROP INDEX IF EXISTS "fin_bal_gasto_provee_gasto_proveedor_ux";

CREATE UNIQUE INDEX "fin_bal_gasto_final_gasto_proveedor_sucursal_ux"
  ON "fin_bal_gasto_provee" ("gasto_id", "proveedor_id", "sucursal_id");

ALTER TABLE "fin_bal_gasto_provee"
ADD CONSTRAINT "fin_bal_gasto_provee_sucursal_id_fkey"
FOREIGN KEY ("sucursal_id") REFERENCES "global_sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "fin_bal_gasto_provee_sucursal_id_idx" ON "fin_bal_gasto_provee" ("sucursal_id");

ALTER TABLE "fin_bal_gasto_provee" RENAME TO "fin_bal_gasto_final";

ALTER INDEX "fin_bal_gasto_provee_pkey" RENAME TO "fin_bal_gasto_final_pkey";

ALTER INDEX "fin_bal_gasto_provee_gasto_id_idx" RENAME TO "fin_bal_gasto_final_gasto_id_idx";

ALTER INDEX "fin_bal_gasto_provee_proveedor_id_idx" RENAME TO "fin_bal_gasto_final_proveedor_id_idx";

ALTER INDEX "fin_bal_gasto_provee_sucursal_id_idx" RENAME TO "fin_bal_gasto_final_sucursal_id_idx";

ALTER TABLE "fin_bal_gasto_final" RENAME CONSTRAINT "fin_bal_gasto_provee_gasto_id_fkey" TO "fin_bal_gasto_final_gasto_id_fkey";

ALTER TABLE "fin_bal_gasto_final" RENAME CONSTRAINT "fin_bal_gasto_provee_proveedor_id_fkey" TO "fin_bal_gasto_final_proveedor_id_fkey";

ALTER TABLE "fin_bal_gasto_final" RENAME CONSTRAINT "fin_bal_gasto_provee_sucursal_id_fkey" TO "fin_bal_gasto_final_sucursal_id_fkey";
