-- Referente de comparación por categoría: fila de prod_precios_competencia (cod_tienda + competencia_id).

ALTER TABLE "prod_comp_presentaciones"
  ADD COLUMN "ref_cod_tienda" TEXT,
  ADD COLUMN "ref_competencia_id" TEXT;

ALTER TABLE "prod_comp_presentaciones"
  ADD CONSTRAINT "prod_comp_presentaciones_ref_competencia_fkey"
  FOREIGN KEY ("ref_cod_tienda", "ref_competencia_id")
  REFERENCES "prod_precios_competencia" ("cod_tienda", "competencia_id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE UNIQUE INDEX "prod_comp_presentaciones_ref_competencia_key"
  ON "prod_comp_presentaciones" ("ref_cod_tienda", "ref_competencia_id");
