-- Vínculo N:1 lista proveedor → precio REX (varios cod_ext pueden compartir el mismo REX).

DROP INDEX IF EXISTS "prod_precios_provee_id_precio_rex_key";

CREATE INDEX IF NOT EXISTS "prod_precios_provee_id_precio_rex_idx"
  ON "prod_precios_provee" ("id_precio_rex");
