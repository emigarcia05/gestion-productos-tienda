-- Cambiar identidad de prod_precios_tienda: de cod_ext a cod_tienda.
-- Objetivo: cuando cambie cod_ext en DUX, se actualice la misma fila por cod_tienda.

-- 1) Deduplicar por cod_tienda: conservar la fila más reciente.
DELETE FROM "prod_precios_tienda" t
USING (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY TRIM(COALESCE("cod_tienda", ''))
        ORDER BY "last_sync" DESC, "id" DESC
      ) AS "rn"
    FROM "prod_precios_tienda"
  ) d
  WHERE d."rn" > 1
) x
WHERE t."id" = x."id";

-- 2) Remover unicidad previa en cod_ext (constraint/index según entorno).
ALTER TABLE "prod_precios_tienda"
  DROP CONSTRAINT IF EXISTS "prod_precios_tienda_cod_ext_key";

DROP INDEX IF EXISTS "prod_precios_tienda_cod_ext_key";

-- 3) Aplicar nueva unicidad en cod_tienda.
CREATE UNIQUE INDEX IF NOT EXISTS "prod_precios_tienda_cod_tienda_key"
  ON "prod_precios_tienda" ("cod_tienda");
