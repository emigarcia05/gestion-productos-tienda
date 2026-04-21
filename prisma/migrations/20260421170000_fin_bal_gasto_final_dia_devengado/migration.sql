-- Día de devengamiento (1–28) por fila de gasto final. Obligatorio; filas existentes → 1.

ALTER TABLE "fin_bal_gasto_final" ADD COLUMN "dia_devengado" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "fin_bal_gasto_final"
ADD CONSTRAINT "fin_bal_gasto_final_dia_devengado_chk"
CHECK ("dia_devengado" >= 1 AND "dia_devengado" <= 28);

ALTER TABLE "fin_bal_gasto_final" ALTER COLUMN "dia_devengado" DROP DEFAULT;
