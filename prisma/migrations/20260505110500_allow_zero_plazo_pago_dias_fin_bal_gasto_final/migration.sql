ALTER TABLE "fin_bal_gasto_final"
DROP CONSTRAINT IF EXISTS "fin_bal_gasto_final_plazo_pago_dias_check";

ALTER TABLE "fin_bal_gasto_final"
ADD CONSTRAINT "fin_bal_gasto_final_plazo_pago_dias_check"
CHECK ("plazo_pago_dias" >= 0 AND "plazo_pago_dias" <= 30);
