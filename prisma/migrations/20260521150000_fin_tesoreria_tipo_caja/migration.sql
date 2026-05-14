-- Catálogo de tipos de caja (`codigo` alineado al enum `TipoCajaTesoreria`).
-- Semilla: valores actuales + TARJETAS A COBRAR.

CREATE TABLE "fin_tesoreria_tipo_caja" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_tesoreria_tipo_caja_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fin_tesoreria_tipo_caja_codigo_key" ON "fin_tesoreria_tipo_caja"("codigo");

CREATE INDEX "fin_tesoreria_tipo_caja_orden_idx" ON "fin_tesoreria_tipo_caja"("orden");

ALTER TYPE "TipoCajaTesoreria" ADD VALUE 'TARJETAS_A_COBRAR';

INSERT INTO "fin_tesoreria_tipo_caja" ("id", "codigo", "nombre", "orden", "created_at", "updated_at")
VALUES
    (gen_random_uuid()::text, 'BANCO', 'BANCO', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'BILLETERA_DIGITAL', 'BILLETERA DIGITAL', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'CHEQUE', 'CHEQUE', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'EFECTIVO', 'CAJA LOCAL', 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'TARJETAS_A_COBRAR', 'TARJETAS A COBRAR', 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
