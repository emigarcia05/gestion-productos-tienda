-- Conversión opcional en presentaciones.
ALTER TABLE "est_por_prod_presentacion"
  ALTER COLUMN "conversion_a_unidad_id" DROP NOT NULL,
  ALTER COLUMN "conversion_a_unidad_presentacion" DROP NOT NULL;
