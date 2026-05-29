-- Entornos que ya aplicaron 20260528230000 con el nombre anterior.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'prod_precios_tienda_px_lista_config'
  ) THEN
    ALTER TABLE "prod_precios_tienda_px_lista_config" RENAME TO "prod_precios_tienda_marcacion";

    IF EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'prod_precios_tienda_px_lista_config_competencia_id_idx'
    ) THEN
      ALTER INDEX "prod_precios_tienda_px_lista_config_competencia_id_idx"
        RENAME TO "prod_precios_tienda_marcacion_competencia_id_idx";
    END IF;

    ALTER TABLE "prod_precios_tienda_marcacion"
      RENAME CONSTRAINT "prod_precios_tienda_px_lista_config_pkey"
      TO "prod_precios_tienda_marcacion_pkey";

    ALTER TABLE "prod_precios_tienda_marcacion"
      RENAME CONSTRAINT "prod_precios_tienda_px_lista_config_cod_tienda_fkey"
      TO "prod_precios_tienda_marcacion_cod_tienda_fkey";

    ALTER TABLE "prod_precios_tienda_marcacion"
      RENAME CONSTRAINT "prod_precios_tienda_px_lista_config_competencia_id_fkey"
      TO "prod_precios_tienda_marcacion_competencia_id_fkey";
  END IF;
END $$;
