-- Vínculo 1:1 opcional lista proveedor → precio REX.

ALTER TABLE "prod_precios_provee"
  ADD COLUMN "id_precio_rex" TEXT;

CREATE UNIQUE INDEX "prod_precios_provee_id_precio_rex_key"
  ON "prod_precios_provee" ("id_precio_rex");

ALTER TABLE "prod_precios_provee"
  ADD CONSTRAINT "prod_precios_provee_id_precio_rex_fkey"
  FOREIGN KEY ("id_precio_rex") REFERENCES "prod_precios_rex" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
