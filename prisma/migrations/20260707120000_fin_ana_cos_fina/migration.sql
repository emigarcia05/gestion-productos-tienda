-- Análisis M.C. · Costos financieros (matriz terminal × forma de pago).

CREATE TYPE "FinAnaCosFinaTerminal" AS ENUM ('MERCADOPAGO', 'PAYWAY', 'NAVE');

CREATE TYPE "FinAnaCosFinaPago" AS ENUM (
    'DEBITO',
    'CUOTA_1',
    'CUOTA_3',
    'CUOTA_6',
    'CUOTA_9',
    'CUOTA_12',
    'CUOTA_18'
);

CREATE TABLE "fin_ana_cos_fina" (
    "id" TEXT NOT NULL,
    "habilitado" BOOLEAN NOT NULL DEFAULT true,
    "terminal" "FinAnaCosFinaTerminal" NOT NULL,
    "pago" "FinAnaCosFinaPago" NOT NULL,
    "dias_acreditacion" INTEGER,
    "arancel" DECIMAL(5, 2) NOT NULL DEFAULT 0,
    "costo_financiero" DECIMAL(5, 2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_ana_cos_fina_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fin_ana_cos_fina_terminal_pago_ux" ON "fin_ana_cos_fina"("terminal", "pago");

CREATE INDEX "fin_ana_cos_fina_terminal_idx" ON "fin_ana_cos_fina"("terminal");

INSERT INTO "fin_ana_cos_fina" (
    "id",
    "habilitado",
    "terminal",
    "pago",
    "dias_acreditacion",
    "arancel",
    "costo_financiero",
    "created_at",
    "updated_at"
)
VALUES
    ('clfinacosfinampdeb000001', true, 'MERCADOPAGO', 'DEBITO', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinampcu1000001', true, 'MERCADOPAGO', 'CUOTA_1', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinampcu3000001', true, 'MERCADOPAGO', 'CUOTA_3', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinampcu6000001', true, 'MERCADOPAGO', 'CUOTA_6', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinampcu9000001', true, 'MERCADOPAGO', 'CUOTA_9', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinampc12u00001', true, 'MERCADOPAGO', 'CUOTA_12', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinampc18u00001', true, 'MERCADOPAGO', 'CUOTA_18', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinapwdeb000001', true, 'PAYWAY', 'DEBITO', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinapwcu1000001', true, 'PAYWAY', 'CUOTA_1', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinapwcu3000001', true, 'PAYWAY', 'CUOTA_3', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinapwcu6000001', true, 'PAYWAY', 'CUOTA_6', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinapwcu9000001', true, 'PAYWAY', 'CUOTA_9', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinapwc12u00001', true, 'PAYWAY', 'CUOTA_12', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinapwc18u00001', true, 'PAYWAY', 'CUOTA_18', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinanvdeb000001', true, 'NAVE', 'DEBITO', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinanvcu1000001', true, 'NAVE', 'CUOTA_1', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinanvcu3000001', true, 'NAVE', 'CUOTA_3', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinanvcu6000001', true, 'NAVE', 'CUOTA_6', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinanvcu9000001', true, 'NAVE', 'CUOTA_9', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinanvc12u00001', true, 'NAVE', 'CUOTA_12', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfinanvc18u00001', true, 'NAVE', 'CUOTA_18', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
