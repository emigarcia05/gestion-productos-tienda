-- Elimina la tabla legada `prod_ped_merc` y las funciones/triggers que la sincronizaban.
-- El canónico queda en `prod_ped_merc_2` hasta `20260430120000_rename_prod_ped_merc_2_to_prod_ped_merc` → `prod_ped_merc`.

-- Trigger en `prod_precios_tienda` (nombres posibles según migraciones previas).
DROP TRIGGER IF EXISTS trg_sync_reposicion_on_precios_tienda_stock ON "prod_precios_tienda";
DROP TRIGGER IF EXISTS trg_sync_reposicion_on_prod_precios_tienda_stock ON "prod_precios_tienda";

DO $$
BEGIN
  IF to_regclass('public.prod_ped_merc') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_sync_prod_ped_merc_cant_pedir ON prod_ped_merc';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_sync_pedidos_mercaderia_cant_pedir ON prod_ped_merc';
  END IF;
END $$;

DROP FUNCTION IF EXISTS sync_reposicion_on_precios_tienda_stock_change() CASCADE;
DROP FUNCTION IF EXISTS sync_pedidos_mercaderia_cant_pedir() CASCADE;

DROP TABLE IF EXISTS "prod_ped_merc" CASCADE;
