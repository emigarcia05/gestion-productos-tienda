-- Gastos eventuales: varias imputaciones por (gasto_final, mes, anio) y misma sucursal.
-- Gastos mensuales (carga de catálogo): se mantiene una fila por (gasto_final, mes, anio).

ALTER TABLE "fin_bal_gasto_mensual"
ADD COLUMN "gasto_mensual_en_alta" BOOLEAN NOT NULL DEFAULT false;

UPDATE "fin_bal_gasto_mensual" AS m
SET "gasto_mensual_en_alta" = gf."gasto_mensual"
FROM "fin_bal_gasto_final" AS gf
WHERE gf."id" = m."gasto_final_id";

DROP INDEX IF EXISTS "fin_bal_gasto_mensual_gasto_mes_anio_ux";

CREATE UNIQUE INDEX "fin_bal_gasto_mensual_mensual_gasto_mes_anio_ux"
ON "fin_bal_gasto_mensual" ("gasto_final_id", "mes", "anio")
WHERE "gasto_mensual_en_alta" = true;
