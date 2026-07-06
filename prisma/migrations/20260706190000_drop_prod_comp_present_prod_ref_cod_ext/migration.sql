-- Retiro legacy: costo objetivo por FK a prod_precios_provee → solo costo_compra_objetivo numérico.
-- Backfill desde px_compra_final_sin_iva donde aún no hay valor manual ni referencias competencia activas.

UPDATE "prod_comp_presentaciones" AS p
SET "costo_compra_objetivo" = lp."px_compra_final_sin_iva"
FROM "prod_precios_provee" AS lp
WHERE p."prod_ref_cod_ext" = lp."cod_ext"
  AND p."costo_compra_objetivo" IS NULL
  AND p."prod_ref_cod_ext" IS NOT NULL;

ALTER TABLE "prod_comp_presentaciones"
  DROP CONSTRAINT IF EXISTS "prod_comp_presentaciones_prod_ref_cod_ext_fkey";

DROP INDEX IF EXISTS "prod_comp_presentaciones_prod_ref_cod_ext_key";

ALTER TABLE "prod_comp_presentaciones"
  DROP COLUMN IF EXISTS "prod_ref_cod_ext";
