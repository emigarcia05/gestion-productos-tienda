-- prod_precios_tienda: renombrar FK de costo Cx & Px (submódulo cx-px-tienda).
ALTER TABLE "prod_precios_tienda"
RENAME COLUMN "cod_ext_costo_compra" TO "cx_px_cx_cod_ext";

-- Índice / constraint pueden conservar el nombre legacy de la migración original.
ALTER INDEX IF EXISTS "prod_precios_tienda_cod_ext_costo_lista_idx"
RENAME TO "prod_precios_tienda_cx_px_cx_cod_ext_idx";

ALTER INDEX IF EXISTS "prod_precios_tienda_cod_ext_costo_compra_idx"
RENAME TO "prod_precios_tienda_cx_px_cx_cod_ext_idx";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prod_precios_tienda_cod_ext_costo_lista_fkey'
  ) THEN
    ALTER TABLE "prod_precios_tienda"
    RENAME CONSTRAINT "prod_precios_tienda_cod_ext_costo_lista_fkey"
    TO "prod_precios_tienda_cx_px_cx_cod_ext_fkey";
  ELSIF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prod_precios_tienda_cod_ext_costo_compra_fkey'
  ) THEN
    ALTER TABLE "prod_precios_tienda"
    RENAME CONSTRAINT "prod_precios_tienda_cod_ext_costo_compra_fkey"
    TO "prod_precios_tienda_cx_px_cx_cod_ext_fkey";
  END IF;
END $$;
