-- prod_listas_precios_tienda → prod_tienda_listas_precios (alineado a prod_tienda_stock)

ALTER TABLE "prod_listas_precios_tienda" RENAME TO "prod_tienda_listas_precios";

ALTER INDEX IF EXISTS "prod_listas_precios_tienda_pkey"
  RENAME TO "prod_tienda_listas_precios_pkey";

ALTER INDEX IF EXISTS "prod_listas_precios_tienda_id_lista_idx"
  RENAME TO "prod_tienda_listas_precios_id_lista_idx";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prod_listas_precios_tienda_cod_tienda_fkey'
  ) THEN
    ALTER TABLE "prod_tienda_listas_precios"
      RENAME CONSTRAINT "prod_listas_precios_tienda_cod_tienda_fkey"
      TO "prod_tienda_listas_precios_cod_tienda_fkey";
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prod_listas_precios_tienda_id_lista_fkey'
  ) THEN
    ALTER TABLE "prod_tienda_listas_precios"
      RENAME CONSTRAINT "prod_listas_precios_tienda_id_lista_fkey"
      TO "prod_tienda_listas_precios_id_lista_fkey";
  END IF;
END $$;
