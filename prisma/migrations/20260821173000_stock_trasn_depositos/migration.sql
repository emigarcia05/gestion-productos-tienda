-- Ledger de transferencias entre depósitos (Trans. Depósitos).
CREATE TABLE IF NOT EXISTS "stock_trasn_depositos" (
    "id" TEXT NOT NULL,
    "cod_tienda" TEXT NOT NULL,
    "cant" INTEGER NOT NULL,
    "suc_origen" TEXT NOT NULL,
    "suc_destino" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_trasn_depositos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stock_trasn_depositos_cant_positive" CHECK ("cant" > 0),
    CONSTRAINT "stock_trasn_depositos_suc_distintas" CHECK ("suc_origen" <> "suc_destino")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_trasn_depositos_cod_tienda_fkey'
  ) THEN
    ALTER TABLE "stock_trasn_depositos"
      ADD CONSTRAINT "stock_trasn_depositos_cod_tienda_fkey"
      FOREIGN KEY ("cod_tienda") REFERENCES "prod_tienda"("cod_tienda")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_trasn_depositos_suc_origen_fkey'
  ) THEN
    ALTER TABLE "stock_trasn_depositos"
      ADD CONSTRAINT "stock_trasn_depositos_suc_origen_fkey"
      FOREIGN KEY ("suc_origen") REFERENCES "global_sucursales"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_trasn_depositos_suc_destino_fkey'
  ) THEN
    ALTER TABLE "stock_trasn_depositos"
      ADD CONSTRAINT "stock_trasn_depositos_suc_destino_fkey"
      FOREIGN KEY ("suc_destino") REFERENCES "global_sucursales"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "stock_trasn_depositos_tienda_fecha_idx"
  ON "stock_trasn_depositos"("cod_tienda", "created_at");

CREATE INDEX IF NOT EXISTS "stock_trasn_depositos_par_fecha_idx"
  ON "stock_trasn_depositos"("suc_origen", "suc_destino", "created_at");
