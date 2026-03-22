-- Ítems del historial de pedidos: nombre final de tabla.
DO $$
BEGIN
  IF to_regclass('public.pedidos_mercaderia_historial') IS NOT NULL THEN
    ALTER TABLE "pedidos_mercaderia_historial" RENAME TO "pedidos_historial_mercaderia";
  END IF;
END $$;
