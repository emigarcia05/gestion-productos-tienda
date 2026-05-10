-- Totales ventas con IVA por mes/año (Posición de IVA).
CREATE TABLE "fin_bal_iva_deb" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "monto" INTEGER NOT NULL,

    CONSTRAINT "fin_bal_iva_deb_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fin_bal_iva_deb_mes_anio_ux" ON "fin_bal_iva_deb" ("anio", "mes");
CREATE INDEX "fin_bal_iva_deb_anio_idx" ON "fin_bal_iva_deb" ("anio");
