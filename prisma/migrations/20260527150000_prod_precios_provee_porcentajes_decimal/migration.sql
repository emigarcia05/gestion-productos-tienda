-- Porcentajes de lista proveedor: INTEGER → NUMERIC(5,2) para admitir 2 decimales (0–100).
-- PostgreSQL no permite ALTER TYPE en columnas usadas por una columna GENERATED:
-- se recrea px_compra_final_sin_iva con la misma expresión que 20260319091000 (suma de dto_*).

ALTER TABLE "prod_precios_provee"
  DROP COLUMN "px_compra_final_sin_iva";

ALTER TABLE "prod_precios_provee"
  ALTER COLUMN "dto_proveedor" TYPE NUMERIC(5, 2) USING "dto_proveedor"::numeric,
  ALTER COLUMN "dto_marca" TYPE NUMERIC(5, 2) USING "dto_marca"::numeric,
  ALTER COLUMN "dto_rubro" TYPE NUMERIC(5, 2) USING "dto_rubro"::numeric,
  ALTER COLUMN "dto_cantidad" TYPE NUMERIC(5, 2) USING "dto_cantidad"::numeric,
  ALTER COLUMN "dto_financiero" TYPE NUMERIC(5, 2) USING "dto_financiero"::numeric,
  ALTER COLUMN "cx_transporte" TYPE NUMERIC(5, 2) USING "cx_transporte"::numeric;

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
              )
            )::numeric / 100
      )
    * (1 + COALESCE("cx_transporte", 0)::numeric / 100)
  ) STORED;
