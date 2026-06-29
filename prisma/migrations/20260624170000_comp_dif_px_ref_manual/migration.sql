-- Comp. Categorias: persistir dif % vs referencia (no margen %).
ALTER TABLE "prod_comp_margen_manual" RENAME TO "prod_comp_dif_px_ref_manual";

ALTER TABLE "prod_comp_dif_px_ref_manual"
  RENAME COLUMN "margen_manual" TO "dif_px_ref_manual";

-- Valores legacy eran margen %, no dif % vs referencia.
UPDATE "prod_comp_dif_px_ref_manual" SET "dif_px_ref_manual" = NULL;

ALTER INDEX "prod_comp_margen_manual_cod_ext_prod_precios_provee_key"
  RENAME TO "prod_comp_dif_px_ref_manual_cod_ext_prod_precios_provee_key";

ALTER TABLE "prod_comp_dif_px_ref_manual"
  RENAME CONSTRAINT "prod_comp_margen_manual_pkey" TO "prod_comp_dif_px_ref_manual_pkey";

ALTER TABLE "prod_comp_dif_px_ref_manual"
  RENAME CONSTRAINT "prod_comp_margen_manual_cod_ext_prod_precios_provee_fkey"
  TO "prod_comp_dif_px_ref_manual_cod_ext_prod_precios_provee_fkey";
