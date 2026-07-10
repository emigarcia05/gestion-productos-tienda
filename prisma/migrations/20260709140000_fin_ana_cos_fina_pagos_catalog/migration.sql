-- Catálogo dinámico de formas de pago (Análisis M.C.).

CREATE TABLE "fin_ana_cos_fina_pagos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "en_costos_financieros" BOOLEAN NOT NULL DEFAULT true,
    "en_margen_contribucion" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_ana_cos_fina_pagos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fin_ana_cos_fina_pagos_codigo_key" ON "fin_ana_cos_fina_pagos"("codigo");
CREATE UNIQUE INDEX "fin_ana_cos_fina_pagos_nombre_key" ON "fin_ana_cos_fina_pagos"("nombre");
CREATE INDEX "fin_ana_cos_fina_pagos_orden_idx" ON "fin_ana_cos_fina_pagos"("orden");

INSERT INTO "fin_ana_cos_fina_pagos" (
    "id", "codigo", "nombre", "orden", "en_costos_financieros", "en_margen_contribucion", "created_at", "updated_at"
) VALUES
    ('clfinapago0000001deb', 'DEBITO', 'DÉBITO', 0, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinapago0000002c01', 'CUOTA_1', '1 CUOTA', 1, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinapago0000003c03', 'CUOTA_3', '3 CUOTAS', 2, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinapago0000004c06', 'CUOTA_6', '6 CUOTAS', 3, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinapago0000005c09', 'CUOTA_9', '9 CUOTAS', 4, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinapago0000006c12', 'CUOTA_12', '12 CUOTAS', 5, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinapago0000007c18', 'CUOTA_18', '18 CUOTAS', 6, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinapago0000008efe', 'EFECTIVO', 'EFECTIVO', 7, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- fin_ana_cos_fina: enum pago → FK pago_id
ALTER TABLE "fin_ana_cos_fina" ADD COLUMN "pago_id" TEXT;

UPDATE "fin_ana_cos_fina" AS f
SET "pago_id" = p."id"
FROM "fin_ana_cos_fina_pagos" AS p
WHERE p."codigo" = f."pago"::text;

ALTER TABLE "fin_ana_cos_fina" ALTER COLUMN "pago_id" SET NOT NULL;

DROP INDEX "fin_ana_cos_fina_terminal_pago_ux";
DROP INDEX "fin_ana_cos_fina_terminal_idx";

ALTER TABLE "fin_ana_cos_fina" DROP COLUMN "pago";

CREATE UNIQUE INDEX "fin_ana_cos_fina_terminal_pago_ux" ON "fin_ana_cos_fina"("terminal_id", "pago_id");
CREATE INDEX "fin_ana_cos_fina_terminal_idx" ON "fin_ana_cos_fina"("terminal_id");
CREATE INDEX "fin_ana_cos_fina_pago_idx" ON "fin_ana_cos_fina"("pago_id");

ALTER TABLE "fin_ana_cos_fina"
ADD CONSTRAINT "fin_ana_cos_fina_pago_id_fkey"
FOREIGN KEY ("pago_id") REFERENCES "fin_ana_cos_fina_pagos"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

DROP TYPE "FinAnaCosFinaPago";

-- fin_ana_mc_descuento_fp: forma_pago TEXT → FK pago_id
ALTER TABLE "fin_ana_mc_descuento_fp" ADD COLUMN "pago_id" TEXT;

UPDATE "fin_ana_mc_descuento_fp" AS d
SET "pago_id" = p."id"
FROM "fin_ana_cos_fina_pagos" AS p
WHERE p."codigo" = d."forma_pago";

ALTER TABLE "fin_ana_mc_descuento_fp" ALTER COLUMN "pago_id" SET NOT NULL;

DROP INDEX "fin_ana_mc_descuento_fp_forma_pago_key";
ALTER TABLE "fin_ana_mc_descuento_fp" DROP COLUMN "forma_pago";

CREATE UNIQUE INDEX "fin_ana_mc_descuento_fp_pago_id_key" ON "fin_ana_mc_descuento_fp"("pago_id");

ALTER TABLE "fin_ana_mc_descuento_fp"
ADD CONSTRAINT "fin_ana_mc_descuento_fp_pago_id_fkey"
FOREIGN KEY ("pago_id") REFERENCES "fin_ana_cos_fina_pagos"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
