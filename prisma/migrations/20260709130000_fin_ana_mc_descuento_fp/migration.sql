-- Descuentos de simulación Margen Contribución (uno por forma de pago).

CREATE TABLE "fin_ana_mc_descuento_fp" (
    "id" TEXT NOT NULL,
    "forma_pago" TEXT NOT NULL,
    "descuento_pct" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_ana_mc_descuento_fp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fin_ana_mc_descuento_fp_forma_pago_key" ON "fin_ana_mc_descuento_fp"("forma_pago");

ALTER TABLE "fin_ana_mc_descuento_fp"
ADD CONSTRAINT "fin_ana_mc_descuento_fp_descuento_pct_check"
CHECK ("descuento_pct" >= -100 AND "descuento_pct" <= 100);

INSERT INTO "fin_ana_mc_descuento_fp" ("id", "forma_pago", "descuento_pct", "created_at", "updated_at")
VALUES
    ('fin_mc_desc_fp_debito', 'DEBITO', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fin_mc_desc_fp_cuota_1', 'CUOTA_1', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fin_mc_desc_fp_cuota_3', 'CUOTA_3', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fin_mc_desc_fp_cuota_6', 'CUOTA_6', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fin_mc_desc_fp_cuota_9', 'CUOTA_9', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fin_mc_desc_fp_cuota_12', 'CUOTA_12', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fin_mc_desc_fp_cuota_18', 'CUOTA_18', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fin_mc_desc_fp_efectivo', 'EFECTIVO', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
