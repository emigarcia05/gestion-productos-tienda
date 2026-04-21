-- Imputación mensual de un gasto final (`fin_bal_gasto_final`).
-- `mes` + `anio` + `dia_devengado` (tabla padre) definen la fecha de devengo en aplicación.
-- `monto` y `pagado` enteros; `pagado` ∈ [0, monto].

CREATE TABLE "fin_bal_gasto_mensual" (
    "id" TEXT NOT NULL,
    "gasto_final_id" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "monto" INTEGER NOT NULL,
    "pagado" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_bal_gasto_mensual_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fin_bal_gasto_mensual_gasto_final_id_fkey"
        FOREIGN KEY ("gasto_final_id") REFERENCES "fin_bal_gasto_final"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fin_bal_gasto_mensual_mes_check" CHECK ("mes" >= 1 AND "mes" <= 12),
    CONSTRAINT "fin_bal_gasto_mensual_anio_check" CHECK ("anio" >= 2000 AND "anio" <= 2100),
    CONSTRAINT "fin_bal_gasto_mensual_monto_check" CHECK ("monto" >= 0),
    CONSTRAINT "fin_bal_gasto_mensual_pagado_check" CHECK ("pagado" >= 0 AND "pagado" <= "monto")
);

CREATE UNIQUE INDEX "fin_bal_gasto_mensual_gasto_mes_anio_ux"
    ON "fin_bal_gasto_mensual" ("gasto_final_id", "mes", "anio");

CREATE INDEX "fin_bal_gasto_mensual_anio_mes_idx" ON "fin_bal_gasto_mensual" ("anio", "mes");
