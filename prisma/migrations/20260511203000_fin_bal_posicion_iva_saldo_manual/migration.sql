-- Saldo IVA manual por mes (posición de IVA): anula visualización de débito/crédito calculados.
CREATE TABLE "fin_bal_posicion_iva_saldo_manual" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "saldo_pesos" DECIMAL(14, 2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_bal_posicion_iva_saldo_manual_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fin_bal_posicion_iva_saldo_manual_anio_mes_ux" ON "fin_bal_posicion_iva_saldo_manual"("anio", "mes");
CREATE INDEX "fin_bal_posicion_iva_saldo_manual_anio_idx" ON "fin_bal_posicion_iva_saldo_manual"("anio");
