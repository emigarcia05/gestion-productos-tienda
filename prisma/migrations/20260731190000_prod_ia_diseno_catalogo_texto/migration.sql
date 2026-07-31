-- Renombra nombre_en → texto (UI = nombre, prompt = texto)

ALTER TABLE "prod_ia_diseno_sup_pintar" RENAME COLUMN "nombre_en" TO "texto";
ALTER TABLE "prod_ia_diseno_estilos" RENAME COLUMN "nombre_en" TO "texto";
ALTER TABLE "prod_ia_diseno_combinar" RENAME COLUMN "nombre_en" TO "texto";
ALTER TABLE "prod_ia_diseno_objetivo" RENAME COLUMN "nombre_en" TO "texto";
ALTER TABLE "prod_ia_diseno_luz_nat" RENAME COLUMN "nombre_en" TO "texto";
ALTER TABLE "prod_ia_diseno_luz_art" RENAME COLUMN "nombre_en" TO "texto";

ALTER INDEX "prod_ia_diseno_sup_pintar_nombre_en_key" RENAME TO "prod_ia_diseno_sup_pintar_texto_key";
ALTER INDEX "prod_ia_diseno_estilos_nombre_en_key" RENAME TO "prod_ia_diseno_estilos_texto_key";
ALTER INDEX "prod_ia_diseno_combinar_nombre_en_key" RENAME TO "prod_ia_diseno_combinar_texto_key";
ALTER INDEX "prod_ia_diseno_objetivo_nombre_en_key" RENAME TO "prod_ia_diseno_objetivo_texto_key";
ALTER INDEX "prod_ia_diseno_luz_nat_nombre_en_key" RENAME TO "prod_ia_diseno_luz_nat_texto_key";
ALTER INDEX "prod_ia_diseno_luz_art_nombre_en_key" RENAME TO "prod_ia_diseno_luz_art_texto_key";
