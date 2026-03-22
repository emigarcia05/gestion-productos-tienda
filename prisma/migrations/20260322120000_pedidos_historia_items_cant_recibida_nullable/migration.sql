-- Permite cant_recibida NULL hasta que en recepción se registre la cantidad recibida.
-- Compatible si la tabla sigue siendo pedidos_historia_items o ya fue renombrada a pedidos_mercaderia_historial.
DO $$
BEGIN
  IF to_regclass('public.pedidos_historia_items') IS NOT NULL THEN
    ALTER TABLE "pedidos_historia_items" ALTER COLUMN "cant_recibida" DROP DEFAULT;
    ALTER TABLE "pedidos_historia_items" ALTER COLUMN "cant_recibida" DROP NOT NULL;
  ELSIF to_regclass('public.pedidos_mercaderia_historial') IS NOT NULL THEN
    ALTER TABLE "pedidos_mercaderia_historial" ALTER COLUMN "cant_recibida" DROP DEFAULT;
    ALTER TABLE "pedidos_mercaderia_historial" ALTER COLUMN "cant_recibida" DROP NOT NULL;
  END IF;
END $$;
