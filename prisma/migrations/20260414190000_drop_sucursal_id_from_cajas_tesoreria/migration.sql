ALTER TABLE "cajas_tesoreria"
DROP CONSTRAINT IF EXISTS "cajas_tesoreria_sucursal_id_fkey";

DROP INDEX IF EXISTS "cajas_tesoreria_sucursal_id_idx";

ALTER TABLE "cajas_tesoreria"
DROP COLUMN IF EXISTS "sucursal_id";
