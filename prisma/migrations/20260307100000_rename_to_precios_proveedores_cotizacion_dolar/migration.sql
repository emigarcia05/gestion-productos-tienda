-- Renombrar tabla lista_precios_proveedores → precios_proveedores.
-- Añadir cotizacion_dolar (default 1) y actualizar fórmula px_compra_final:
-- px_compra_final = (px_lista_proveedor * cotizacion_dolar) - dto_proveedor - dto_marca - dto_producto - dto_cantidad - dto_financiero + cx_transporte

ALTER TABLE "lista_precios_proveedores" RENAME TO "precios_proveedores";

ALTER TABLE "precios_proveedores" ADD COLUMN IF NOT EXISTS "cotizacion_dolar" NUMERIC(14,4) NOT NULL DEFAULT 1;

ALTER TABLE "precios_proveedores" DROP COLUMN IF EXISTS "px_compra_final";

ALTER TABLE "precios_proveedores"
ADD COLUMN "px_compra_final" NUMERIC(14,4) GENERATED ALWAYS AS (
  ("px_lista_proveedor" * "cotizacion_dolar")
  - COALESCE("dto_proveedor", 0)::numeric
  - COALESCE("dto_marca", 0)::numeric
  - COALESCE("dto_producto", 0)::numeric
  - COALESCE("dto_cantidad", 0)::numeric
  - COALESCE("dto_financiero", 0)::numeric
  + COALESCE("cx_transporte", 0)::numeric
) STORED;
