ALTER TABLE "fin_bal_gasto_final"
ALTER COLUMN "dia_devengado" DROP NOT NULL;

ALTER TABLE "fin_bal_gasto_final"
ALTER COLUMN "plazo_pago_dias" DROP NOT NULL;

UPDATE "fin_bal_gasto_final"
SET
  "dia_devengado" = NULL,
  "plazo_pago_dias" = NULL
WHERE "gasto_mensual" = FALSE;

UPDATE "fin_bal_gasto_final"
SET
  "dia_devengado" = COALESCE("dia_devengado", 1),
  "plazo_pago_dias" = COALESCE("plazo_pago_dias", 0)
WHERE "gasto_mensual" = TRUE;

ALTER TABLE "fin_bal_gasto_final"
DROP CONSTRAINT IF EXISTS "fin_bal_gasto_final_dia_devengado_chk";

ALTER TABLE "fin_bal_gasto_final"
DROP CONSTRAINT IF EXISTS "fin_bal_gasto_final_plazo_pago_dias_check";

ALTER TABLE "fin_bal_gasto_final"
ADD CONSTRAINT "fin_bal_gasto_final_campos_mensual_eventual_chk"
CHECK (
  (
    "gasto_mensual" = TRUE
    AND "dia_devengado" IS NOT NULL
    AND "plazo_pago_dias" IS NOT NULL
    AND "dia_devengado" >= 1
    AND "dia_devengado" <= 28
    AND "plazo_pago_dias" >= 0
    AND "plazo_pago_dias" <= 30
  )
  OR
  (
    "gasto_mensual" = FALSE
    AND "dia_devengado" IS NULL
    AND "plazo_pago_dias" IS NULL
  )
);
