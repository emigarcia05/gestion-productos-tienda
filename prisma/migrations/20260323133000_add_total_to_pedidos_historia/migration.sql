ALTER TABLE "pedidos_historia"
  ADD COLUMN IF NOT EXISTS "total" NUMERIC(14, 2);
