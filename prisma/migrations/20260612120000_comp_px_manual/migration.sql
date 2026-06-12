-- Px. venta manual por ítem en Comparacion por categorías.

CREATE TABLE "prod_comp_px_manual" (
  "id" TEXT NOT NULL,
  "cod_ext_prod_precios_provee" TEXT NOT NULL,
  "px_manual" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "prod_comp_px_manual_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prod_comp_px_manual_cod_ext_prod_precios_provee_key"
  ON "prod_comp_px_manual" ("cod_ext_prod_precios_provee");

ALTER TABLE "prod_comp_px_manual"
  ADD CONSTRAINT "prod_comp_px_manual_cod_ext_prod_precios_provee_fkey"
  FOREIGN KEY ("cod_ext_prod_precios_provee")
  REFERENCES "prod_precios_provee" ("cod_ext")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
