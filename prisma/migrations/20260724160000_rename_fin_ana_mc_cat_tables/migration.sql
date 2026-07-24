-- Renombre de tablas Cat. M.C.
ALTER TABLE "fin_ana_mc_categorias" RENAME TO "fin_ana_mc_cat";
ALTER INDEX IF EXISTS "fin_ana_mc_categorias_pkey" RENAME TO "fin_ana_mc_cat_pkey";
ALTER INDEX IF EXISTS "fin_ana_mc_categorias_categoria_key" RENAME TO "fin_ana_mc_cat_categoria_key";
ALTER INDEX IF EXISTS "fin_ana_mc_categorias_desde_pct_idx" RENAME TO "fin_ana_mc_cat_desde_pct_idx";
ALTER TABLE "fin_ana_mc_cat" RENAME CONSTRAINT "fin_ana_mc_categorias_rango_check" TO "fin_ana_mc_cat_rango_check";

ALTER TABLE "fin_ana_mc_config" RENAME TO "fin_ana_mc_cat_config";
ALTER INDEX IF EXISTS "fin_ana_mc_config_pkey" RENAME TO "fin_ana_mc_cat_config_pkey";
ALTER TABLE "fin_ana_mc_cat_config" RENAME CONSTRAINT "fin_ana_mc_config_terminal_id_fkey" TO "fin_ana_mc_cat_config_terminal_id_fkey";
