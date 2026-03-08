-- Corregir px_compra_final: todos los dto_* y cx_transporte son porcentajes.
-- Fórmula: base * (1 - dto_proveedor/100) * (1 - dto_marca/100) * ... * (1 + cx_transporte/100)
-- base = px_lista_proveedor * (cotizacion_dolar si px_dolares, si no 1)

ALTER TABLE "precios_proveedores" DROP COLUMN IF EXISTS "px_compra_final";

ALTER TABLE "precios_proveedores"
ADD COLUMN "px_compra_final" NUMERIC(14,4) GENERATED ALWAYS AS (
  ("px_lista_proveedor" * (CASE WHEN "px_dolares" THEN "cotizacion_dolar" ELSE 1 END))
  * (1 - COALESCE("dto_proveedor", 0)::numeric / 100)
  * (1 - COALESCE("dto_marca", 0)::numeric / 100)
  * (1 - COALESCE("dto_producto", 0)::numeric / 100)
  * (1 - COALESCE("dto_cantidad", 0)::numeric / 100)
  * (1 - COALESCE("dto_financiero", 0)::numeric / 100)
  * (1 + COALESCE("cx_transporte", 0)::numeric / 100)
) STORED;
