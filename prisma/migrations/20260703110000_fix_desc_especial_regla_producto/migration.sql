-- Repara tabla puente si la migración 20260703100000 falló por colisión de nombres de constraint (PG trunca a 63 chars).
-- Idempotente: seguro si la tabla ya existe con los nombres cortos.

CREATE TABLE IF NOT EXISTS "prod_precios_desc_especial_regla_producto" (
  "id" TEXT NOT NULL,
  "regla_id" TEXT NOT NULL,
  "cod_ext_prod_precios_provee" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "prod_precios_desc_especial_regla_producto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pp_desc_esp_regla_prod_cod_ext_key"
    UNIQUE ("cod_ext_prod_precios_provee"),
  CONSTRAINT "pp_desc_esp_regla_prod_regla_id_fkey"
    FOREIGN KEY ("regla_id") REFERENCES "prod_precios_desc_especial_regla"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pp_desc_esp_regla_prod_cod_ext_fkey"
    FOREIGN KEY ("cod_ext_prod_precios_provee") REFERENCES "prod_precios_provee"("cod_ext")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "prod_precios_desc_especial_regla_producto_regla_id_idx"
  ON "prod_precios_desc_especial_regla_producto" ("regla_id");
