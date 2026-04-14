-- Relación de cajas de tesorería con sucursales.
-- Se agrega `sucursal_id` como FK obligatoria hacia `sucursales.id`.

ALTER TABLE "cajas_tesoreria"
ADD COLUMN "sucursal_id" TEXT;

UPDATE "cajas_tesoreria"
SET "sucursal_id" = (
  SELECT s.id
  FROM "sucursales" s
  ORDER BY s.created_at ASC
  LIMIT 1
)
WHERE "sucursal_id" IS NULL;

ALTER TABLE "cajas_tesoreria"
ALTER COLUMN "sucursal_id" SET NOT NULL;

CREATE INDEX "cajas_tesoreria_sucursal_id_idx" ON "cajas_tesoreria"("sucursal_id");

ALTER TABLE "cajas_tesoreria"
ADD CONSTRAINT "cajas_tesoreria_sucursal_id_fkey"
FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
