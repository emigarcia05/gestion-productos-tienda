-- Cotización USD única para lista de precios proveedor.
-- prod_precios_provee.cotizacion_dolar pasa a ser caché del valor global en ítems px_dolares = true.

CREATE TABLE IF NOT EXISTS "global_cotizacion_usd" (
  "id" TEXT NOT NULL,
  "valor" DECIMAL(14, 4) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "global_cotizacion_usd_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "global_cotizacion_usd_valor_check" CHECK ("valor" > 0)
);

INSERT INTO "global_cotizacion_usd" ("id", "valor", "updated_at")
SELECT
  'USD',
  GREATEST(
    COALESCE(
      (
        SELECT MAX("cotizacion_dolar")
        FROM "prod_precios_provee"
        WHERE "px_dolares" = true AND "cotizacion_dolar" > 0
      ),
      1::DECIMAL(14, 4)
    ),
    0.0001::DECIMAL(14, 4)
  ),
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "global_cotizacion_usd" WHERE "id" = 'USD');

UPDATE "prod_precios_provee" AS p
SET
  "cotizacion_dolar" = g."valor",
  "updated_at" = CURRENT_TIMESTAMP
FROM "global_cotizacion_usd" AS g
WHERE g."id" = 'USD' AND p."px_dolares" = true;

UPDATE "prod_precios_provee"
SET
  "cotizacion_dolar" = 1,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "px_dolares" = false AND "cotizacion_dolar" IS DISTINCT FROM 1;
