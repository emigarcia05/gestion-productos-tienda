-- Parámetros de fórmulas Margen Contribución (clave/valor).

CREATE TABLE "fin_ana_mc_formulas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "valor" DECIMAL(14,6) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_ana_mc_formulas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fin_ana_mc_formulas_codigo_key" ON "fin_ana_mc_formulas"("codigo");

INSERT INTO "fin_ana_mc_formulas" ("id", "codigo", "etiqueta", "valor", "orden", "created_at", "updated_at")
VALUES
    ('fin_mc_form_px_lista_c_iva', 'PX_LISTA_C_IVA', 'PX LISTA C/ IVA', 100, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fin_mc_form_iva_alicuota', 'IVA_ALICUOTA', 'IVA ALÍCUOTA', 0.21, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fin_mc_form_iibb_alicuota', 'IIBB_ALICUOTA', 'IIBB ALÍCUOTA', 0.04, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
