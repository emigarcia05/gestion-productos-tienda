-- Actualizar px_compra_final para incluir dto_marca en el cálculo.
-- Fórmula: px_lista_proveedor * (1 - dto_marca/100) * (1 - dto_producto/100) * (1 - dto_cantidad/100) * (1 + cx_aprox_transporte/100)
-- En PostgreSQL hay que eliminar la columna y volver a crearla para cambiar la expresión de una columna generada.

ALTER TABLE "lista_precios_proveedores" DROP COLUMN IF EXISTS "px_compra_final";

ALTER TABLE "lista_precios_proveedores"
ADD COLUMN "px_compra_final" NUMERIC(14,4) GENERATED ALWAYS AS (
  "px_lista_proveedor"
  * (1 - COALESCE("dto_marca", 0)::numeric / 100)
  * (1 - COALESCE("dto_producto", 0)::numeric / 100)
  * (1 - COALESCE("dto_cantidad", 0)::numeric / 100)
  * (1 + COALESCE("cx_aprox_transporte", 0)::numeric / 100)
) STORED;
