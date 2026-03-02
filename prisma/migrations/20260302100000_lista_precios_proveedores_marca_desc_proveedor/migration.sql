-- Añadir columnas marca y desc_proveedor a lista_precios_proveedores.
-- Nueva fórmula px_compra_final: px_lista_proveedor - desc_proveedor - dto_marca - dto_producto - dto_cantidad + cx_aprox_transporte

ALTER TABLE "lista_precios_proveedores" ADD COLUMN IF NOT EXISTS "marca" TEXT;
ALTER TABLE "lista_precios_proveedores" ADD COLUMN IF NOT EXISTS "desc_proveedor" NUMERIC(14,4) NOT NULL DEFAULT 0;

-- Recrear columna generada px_compra_final con la nueva fórmula.
ALTER TABLE "lista_precios_proveedores" DROP COLUMN IF EXISTS "px_compra_final";

ALTER TABLE "lista_precios_proveedores"
ADD COLUMN "px_compra_final" NUMERIC(14,4) GENERATED ALWAYS AS (
  "px_lista_proveedor"
  - COALESCE("desc_proveedor", 0)
  - COALESCE("dto_marca", 0)::numeric
  - COALESCE("dto_producto", 0)::numeric
  - COALESCE("dto_cantidad", 0)::numeric
  + COALESCE("cx_aprox_transporte", 0)::numeric
) STORED;
