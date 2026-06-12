-- Margen manual por ítem en Comp. Categorias (reemplaza px manual).
-- Los valores legacy en px_manual eran precios, no márgenes: se anulan al migrar.

ALTER TABLE "prod_comp_px_manual" RENAME TO "prod_comp_margen_manual";

ALTER TABLE "prod_comp_margen_manual" RENAME COLUMN "px_manual" TO "margen_manual";

UPDATE "prod_comp_margen_manual" SET "margen_manual" = NULL;

ALTER INDEX "prod_comp_px_manual_cod_ext_prod_precios_provee_key"
  RENAME TO "prod_comp_margen_manual_cod_ext_prod_precios_provee_key";

ALTER TABLE "prod_comp_margen_manual"
  RENAME CONSTRAINT "prod_comp_px_manual_pkey" TO "prod_comp_margen_manual_pkey";

ALTER TABLE "prod_comp_margen_manual"
  RENAME CONSTRAINT "prod_comp_px_manual_cod_ext_prod_precios_provee_fkey"
  TO "prod_comp_margen_manual_cod_ext_prod_precios_provee_fkey";
