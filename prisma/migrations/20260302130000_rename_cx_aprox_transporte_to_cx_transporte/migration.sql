-- Renombrar cx_aprox_transporte -> cx_transporte y actualizar fórmula px_compra_final.

ALTER TABLE "lista_precios_proveedores" RENAME COLUMN "cx_aprox_transporte" TO "cx_transporte";

ALTER TABLE "lista_precios_proveedores" DROP COLUMN IF EXISTS "px_compra_final";

ALTER TABLE "lista_precios_proveedores"
ADD COLUMN "px_compra_final" NUMERIC(14,4) GENERATED ALWAYS AS (
  "px_lista_proveedor"
  - COALESCE("dto_proveedor", 0)::numeric
  - COALESCE("dto_marca", 0)::numeric
  - COALESCE("dto_producto", 0)::numeric
  - COALESCE("dto_cantidad", 0)::numeric
  + COALESCE("cx_transporte", 0)::numeric
) STORED;
