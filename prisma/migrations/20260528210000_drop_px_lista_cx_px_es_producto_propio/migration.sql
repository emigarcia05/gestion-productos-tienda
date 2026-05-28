-- Elimina columnas de comparación tienda ↔ competencia y producto propio (se reimplementará después).
ALTER TABLE "prod_precios_tienda" DROP CONSTRAINT IF EXISTS "prod_precios_tienda_cx_px_px_comp_ref_fkey";
DROP INDEX IF EXISTS "prod_precios_tienda_cx_px_px_comp_ref_idx";

ALTER TABLE "prod_precios_tienda" DROP COLUMN IF EXISTS "px_lista_cx_px";
ALTER TABLE "prod_precios_tienda" DROP COLUMN IF EXISTS "es_producto_propio";
ALTER TABLE "prod_precios_tienda" DROP COLUMN IF EXISTS "cx_px_px_comp_ref";
