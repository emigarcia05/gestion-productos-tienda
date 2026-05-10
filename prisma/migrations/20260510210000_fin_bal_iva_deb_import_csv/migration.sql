-- Comprobantes de ventas (CSV AFIP) para Posición de IVA · débito.
CREATE TABLE "fin_bal_iva_deb_import_line" (
    "id" TEXT NOT NULL,
    "dedupe_key" VARCHAR(64) NOT NULL,
    "fecha_emision" DATE NOT NULL,
    "denominacion_receptor" VARCHAR(512) NOT NULL,
    "imp_total" DECIMAL(14, 2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_bal_iva_deb_import_line_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fin_bal_iva_deb_import_line_dedupe_key_key" ON "fin_bal_iva_deb_import_line" ("dedupe_key");
CREATE INDEX "fin_bal_iva_deb_import_line_fecha_emision_idx" ON "fin_bal_iva_deb_import_line" ("fecha_emision");

-- Reemplaza totales mensuales cargados a mano por líneas importadas desde CSV.
DROP TABLE IF EXISTS "fin_bal_iva_deb";
