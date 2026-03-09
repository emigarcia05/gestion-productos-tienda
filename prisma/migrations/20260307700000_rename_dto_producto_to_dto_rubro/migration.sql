-- Renombrar dto_producto -> dto_rubro en precios_proveedores.
-- La columna generada px_compra_final referencia dto_producto: hay que recrearla con dto_rubro.

ALTER TABLE "precios_proveedores" DROP COLUMN IF EXISTS "px_compra_final";

ALTER TABLE "precios_proveedores" RENAME COLUMN "dto_producto" TO "dto_rubro";

ALTER TABLE "precios_proveedores"
ADD COLUMN "px_compra_final" NUMERIC(14,4) GENERATED ALWAYS AS (
  ("px_lista_proveedor" * (CASE WHEN "px_dolares" THEN "cotizacion_dolar" ELSE 1 END))
  * (1 - COALESCE("dto_proveedor", 0)::numeric / 100)
  * (1 - COALESCE("dto_marca", 0)::numeric / 100)
  * (1 - COALESCE("dto_rubro", 0)::numeric / 100)
  * (1 - COALESCE("dto_cantidad", 0)::numeric / 100)
  * (1 - COALESCE("dto_financiero", 0)::numeric / 100)
  * (1 + COALESCE("cx_transporte", 0)::numeric / 100)
) STORED;
