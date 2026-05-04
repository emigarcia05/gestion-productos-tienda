DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'fin_bal_gasto_final'
      AND column_name = 'vencimiento'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'fin_bal_gasto_final'
      AND column_name = 'plazo_pago_dias'
  ) THEN
    ALTER TABLE "fin_bal_gasto_final"
    RENAME COLUMN "vencimiento" TO "plazo_pago_dias";
  END IF;
END $$;

ALTER TABLE "fin_bal_gasto_final"
ADD COLUMN IF NOT EXISTS "plazo_pago_dias" INTEGER NOT NULL DEFAULT 30;

UPDATE "fin_bal_gasto_final"
SET "plazo_pago_dias" = 30
WHERE "plazo_pago_dias" < 1 OR "plazo_pago_dias" > 30;

ALTER TABLE "fin_bal_gasto_final"
DROP CONSTRAINT IF EXISTS "fin_bal_gasto_final_vencimiento_check";

ALTER TABLE "fin_bal_gasto_final"
DROP CONSTRAINT IF EXISTS "fin_bal_gasto_final_plazo_pago_dias_check";

ALTER TABLE "fin_bal_gasto_final"
ADD CONSTRAINT "fin_bal_gasto_final_plazo_pago_dias_check"
CHECK ("plazo_pago_dias" >= 1 AND "plazo_pago_dias" <= 30);
