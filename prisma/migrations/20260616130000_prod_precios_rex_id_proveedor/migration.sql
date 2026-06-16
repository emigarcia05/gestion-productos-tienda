-- prod_precios_rex: FK proveedor + clave única (proveedor, descripción) para upsert por PDF matriz.

ALTER TABLE "prod_precios_rex"
  ADD COLUMN "id_proveedor" TEXT NOT NULL;

ALTER TABLE "prod_precios_rex"
  ADD CONSTRAINT "prod_precios_rex_id_proveedor_fkey"
  FOREIGN KEY ("id_proveedor") REFERENCES "global_proveedores" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "prod_precios_rex_id_proveedor_descripcion_ux"
  ON "prod_precios_rex" ("id_proveedor", "descripcion");

CREATE INDEX "prod_precios_rex_id_proveedor_idx"
  ON "prod_precios_rex" ("id_proveedor");
