-- Trigger legacy en prod_tienda: recalculaba reposición al cambiar stock_maipu/stock_guaymallen.
-- Tras DROP de esas columnas (20260604150000) el trigger pasó a dispararse en cualquier UPDATE
-- y la función aún referenciaba NEW.cod_ext (eliminado en 20260606120000).
-- La lógica de reposición vive en runtime (prod_ped_merc + servicios TS); stock en prod_tienda_stock.

DROP TRIGGER IF EXISTS "trg_sync_reposicion_on_prod_tienda_stock" ON "prod_tienda";
DROP TRIGGER IF EXISTS "trg_sync_reposicion_on_prod_precios_tienda_stock" ON "prod_tienda";
DROP TRIGGER IF EXISTS "trg_sync_reposicion_on_precios_tienda_stock" ON "prod_tienda";

DROP FUNCTION IF EXISTS sync_reposicion_on_precios_tienda_stock_change() CASCADE;
