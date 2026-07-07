-- Catálogo de terminales para costos financieros (reemplaza enum FinAnaCosFinaTerminal).

CREATE TABLE "fin_ana_cos_fina_terminales" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_ana_cos_fina_terminales_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fin_ana_cos_fina_terminales_nombre_key" ON "fin_ana_cos_fina_terminales"("nombre");

CREATE INDEX "fin_ana_cos_fina_terminales_orden_idx" ON "fin_ana_cos_fina_terminales"("orden");

INSERT INTO "fin_ana_cos_fina_terminales" ("id", "nombre", "orden", "created_at", "updated_at")
VALUES
    ('clfinacosfintermmp00001', 'MERCADOPAGO', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfintermpw00001', 'PAYWAY', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinacosfintermnv00001', 'NAVE', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "fin_ana_cos_fina" ADD COLUMN "terminal_id" TEXT;

UPDATE "fin_ana_cos_fina"
SET "terminal_id" = 'clfinacosfintermmp00001'
WHERE "terminal" = 'MERCADOPAGO';

UPDATE "fin_ana_cos_fina"
SET "terminal_id" = 'clfinacosfintermpw00001'
WHERE "terminal" = 'PAYWAY';

UPDATE "fin_ana_cos_fina"
SET "terminal_id" = 'clfinacosfintermnv00001'
WHERE "terminal" = 'NAVE';

ALTER TABLE "fin_ana_cos_fina" ALTER COLUMN "terminal_id" SET NOT NULL;

DROP INDEX "fin_ana_cos_fina_terminal_pago_ux";
DROP INDEX "fin_ana_cos_fina_terminal_idx";

ALTER TABLE "fin_ana_cos_fina" DROP COLUMN "terminal";

CREATE UNIQUE INDEX "fin_ana_cos_fina_terminal_pago_ux" ON "fin_ana_cos_fina"("terminal_id", "pago");
CREATE INDEX "fin_ana_cos_fina_terminal_idx" ON "fin_ana_cos_fina"("terminal_id");

ALTER TABLE "fin_ana_cos_fina"
ADD CONSTRAINT "fin_ana_cos_fina_terminal_id_fkey"
FOREIGN KEY ("terminal_id") REFERENCES "fin_ana_cos_fina_terminales"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

DROP TYPE "FinAnaCosFinaTerminal";
