-- Periodo calendario por fila de ventas balance.
ALTER TABLE "fin_bal_vtas" ADD COLUMN "mes" INTEGER;
ALTER TABLE "fin_bal_vtas" ADD COLUMN "anio" INTEGER;

UPDATE "fin_bal_vtas"
SET
    "mes" = EXTRACT(MONTH FROM "created_at")::integer,
    "anio" = EXTRACT(YEAR FROM "created_at")::integer
WHERE "mes" IS NULL OR "anio" IS NULL;

ALTER TABLE "fin_bal_vtas" ALTER COLUMN "mes" SET NOT NULL;
ALTER TABLE "fin_bal_vtas" ALTER COLUMN "anio" SET NOT NULL;

ALTER TABLE "fin_bal_vtas"
ADD CONSTRAINT "fin_bal_vtas_mes_check" CHECK ("mes" >= 1 AND "mes" <= 12);

ALTER TABLE "fin_bal_vtas"
ADD CONSTRAINT "fin_bal_vtas_anio_check" CHECK ("anio" >= 2000 AND "anio" <= 2100);

CREATE INDEX "fin_bal_vtas_anio_mes_idx" ON "fin_bal_vtas" ("anio", "mes");
