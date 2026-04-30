ALTER TABLE "fin_bal_gasto_final"
ADD COLUMN IF NOT EXISTS "vencimiento" INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fin_bal_gasto_final_vencimiento_check'
  ) THEN
    ALTER TABLE "fin_bal_gasto_final"
    ADD CONSTRAINT "fin_bal_gasto_final_vencimiento_check"
    CHECK ("vencimiento" >= 0);
  END IF;
END $$;
