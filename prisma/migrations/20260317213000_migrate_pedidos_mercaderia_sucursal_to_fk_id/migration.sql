-- Migra pedidos_mercaderia.sucursal (codigo texto) a sucursal_id (FK a sucursales.id).
-- Diseñado para ser tolerante en Neon (entornos parcialmente migrados).

ALTER TABLE "pedidos_mercaderia"
  ADD COLUMN IF NOT EXISTS "sucursal_id" TEXT;

UPDATE "pedidos_mercaderia" pm
SET "sucursal_id" = s."id"
FROM "sucursales" s
WHERE pm."sucursal_id" IS NULL
  AND pm."sucursal" = s."codigo";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "pedidos_mercaderia"
    WHERE "sucursal_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Hay filas en pedidos_mercaderia sin sucursal_id. Revisar valores de columna sucursal.';
  END IF;
END $$;

ALTER TABLE "pedidos_mercaderia"
  ALTER COLUMN "sucursal_id" SET NOT NULL;

DROP INDEX IF EXISTS "pedidos_mercaderia_item_unique";
DROP INDEX IF EXISTS "pedidos_mercaderia_sucursal_idx";

ALTER TABLE "pedidos_mercaderia"
  DROP CONSTRAINT IF EXISTS "pedidos_mercaderia_sucursal_fkey";
ALTER TABLE "pedidos_mercaderia"
  DROP CONSTRAINT IF EXISTS "pedidos_envio_sucursal_fkey";

ALTER TABLE "pedidos_mercaderia"
  DROP COLUMN IF EXISTS "sucursal";

ALTER TABLE "pedidos_mercaderia"
  ADD CONSTRAINT "pedidos_mercaderia_sucursal_id_fkey"
  FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "pedidos_mercaderia_item_unique"
  ON "pedidos_mercaderia"("id_proveedor", "tipo_de_pedido", "sucursal_id", "cod_ext");

CREATE INDEX IF NOT EXISTS "pedidos_mercaderia_sucursal_id_idx"
  ON "pedidos_mercaderia"("sucursal_id");
