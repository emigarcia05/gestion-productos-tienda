-- Desc. específico por producto: columna desc_especial + reglas con vínculo por cod_ext.
-- Recrea px_compra_final_sin_iva sumando desc_especial al dtoTotal.

ALTER TABLE "prod_precios_provee"
  ADD COLUMN "desc_especial" NUMERIC(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE "prod_precios_provee"
  DROP COLUMN "px_compra_final_sin_iva";

ALTER TABLE "prod_precios_provee"
  ADD COLUMN "px_compra_final_sin_iva" NUMERIC(14, 4) GENERATED ALWAYS AS (
    ("px_lista_proveedor" * (CASE WHEN "px_dolares" THEN "cotizacion_dolar" ELSE 1 END))
    * (
        1 - LEAST(
              100,
              GREATEST(
                0,
                COALESCE("dto_proveedor", 0)
                + COALESCE("dto_marca", 0)
                + COALESCE("dto_rubro", 0)
                + COALESCE("dto_cantidad", 0)
                + COALESCE("dto_financiero", 0)
                + COALESCE("desc_especial", 0)
              )
            )::numeric / 100
      )
    * (1 + COALESCE("cx_transporte", 0)::numeric / 100)
  ) STORED;

CREATE TABLE "prod_precios_desc_especial_regla" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "valor" NUMERIC(5, 2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "prod_precios_desc_especial_regla_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "prod_precios_desc_especial_regla_producto" (
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

CREATE INDEX "prod_precios_desc_especial_regla_producto_regla_id_idx"
  ON "prod_precios_desc_especial_regla_producto" ("regla_id");
