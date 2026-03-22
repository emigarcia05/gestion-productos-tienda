-- Renombra solo si aún existe el nombre histórico (evita error si ya se aplicó a mano en Neon).
DO $$
BEGIN
  IF to_regclass('public.pedidos_historia_items') IS NOT NULL THEN
    ALTER TABLE "pedidos_historia_items" RENAME TO "pedidos_mercaderia_historial";
  END IF;
END $$;
