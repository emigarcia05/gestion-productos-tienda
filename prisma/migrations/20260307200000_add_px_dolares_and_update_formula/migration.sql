-- Añadir columna px_dolares (boolean): mapea el switch SÍ/NO del modal de importación.
-- Si true, el precio se multiplica por cotizacion_dolar; si false, por 1.
-- Actualizar px_compra_final: (px_lista_proveedor * (CASE WHEN px_dolares THEN cotizacion_dolar ELSE 1 END)) - dto_* ... + cx_transporte

ALTER TABLE "precios_proveedores" ADD COLUMN IF NOT EXISTS "px_dolares" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "precios_proveedores" DROP COLUMN IF EXISTS "px_compra_final";

ALTER TABLE "precios_proveedores"
ADD COLUMN "px_compra_final" NUMERIC(14,4) GENERATED ALWAYS AS (
  ("px_lista_proveedor" * (CASE WHEN "px_dolares" THEN "cotizacion_dolar" ELSE 1 END))
  - COALESCE("dto_proveedor", 0)::numeric
  - COALESCE("dto_marca", 0)::numeric
  - COALESCE("dto_producto", 0)::numeric
  - COALESCE("dto_cantidad", 0)::numeric
  - COALESCE("dto_financiero", 0)::numeric
  + COALESCE("cx_transporte", 0)::numeric
) STORED;
