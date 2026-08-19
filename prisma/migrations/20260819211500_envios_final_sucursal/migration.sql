-- Sucursal que envía (`global_sucursales` con `pedido = true`).
ALTER TABLE "envios_final"
ADD COLUMN "sucursal_id" TEXT;

UPDATE "envios_final"
SET "sucursal_id" = (
  SELECT "id" FROM "global_sucursales"
  WHERE "codigo" = 'guaymallen'
  LIMIT 1
)
WHERE "sucursal_id" IS NULL;

UPDATE "envios_final"
SET "sucursal_id" = (
  SELECT "id" FROM "global_sucursales"
  WHERE "pedido" = true
  ORDER BY "nombre" ASC
  LIMIT 1
)
WHERE "sucursal_id" IS NULL;

ALTER TABLE "envios_final"
ALTER COLUMN "sucursal_id" SET NOT NULL;

ALTER TABLE "envios_final"
ADD CONSTRAINT "envios_final_sucursal_id_fkey"
FOREIGN KEY ("sucursal_id") REFERENCES "global_sucursales"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "envios_final_sucursal_id_idx" ON "envios_final"("sucursal_id");
