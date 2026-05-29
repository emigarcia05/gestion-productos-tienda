-- prod_precios_tienda: renombrar FK de costo de compra (CX PROD.).
ALTER TABLE "prod_precios_tienda"
RENAME COLUMN "cx_px_cx_cod_ext" TO "costo_compra_cod_ext";

ALTER INDEX IF EXISTS "prod_precios_tienda_cx_px_cx_cod_ext_idx"
RENAME TO "prod_precios_tienda_costo_compra_cod_ext_idx";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prod_precios_tienda_cx_px_cx_cod_ext_fkey'
  ) THEN
    ALTER TABLE "prod_precios_tienda"
    RENAME CONSTRAINT "prod_precios_tienda_cx_px_cx_cod_ext_fkey"
    TO "prod_precios_tienda_costo_compra_cod_ext_fkey";
  END IF;
END $$;
