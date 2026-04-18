-- Jerarquía Finanzas → Balance → Gastos:
--   fin_bal_gasto_tipo (1) ─→ fin_bal_gasto_rubro (N) ─→ fin_bal_gasto (N)
-- FKs con onDelete: RESTRICT para evitar datos colgados.
-- Unicidad del `nombre` por padre (no global) para permitir nombres repetidos en distintos tipos/rubros.

CREATE TABLE "fin_bal_gasto_rubro" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_bal_gasto_rubro_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fin_bal_gasto_rubro_tipo_nombre_ux" ON "fin_bal_gasto_rubro"("tipo_id", "nombre");

CREATE INDEX "fin_bal_gasto_rubro_tipo_id_idx" ON "fin_bal_gasto_rubro"("tipo_id");

ALTER TABLE "fin_bal_gasto_rubro"
ADD CONSTRAINT "fin_bal_gasto_rubro_tipo_id_fkey"
FOREIGN KEY ("tipo_id") REFERENCES "fin_bal_gasto_tipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "fin_bal_gasto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rubro_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_bal_gasto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fin_bal_gasto_rubro_nombre_ux" ON "fin_bal_gasto"("rubro_id", "nombre");

CREATE INDEX "fin_bal_gasto_rubro_id_idx" ON "fin_bal_gasto"("rubro_id");

ALTER TABLE "fin_bal_gasto"
ADD CONSTRAINT "fin_bal_gasto_rubro_id_fkey"
FOREIGN KEY ("rubro_id") REFERENCES "fin_bal_gasto_rubro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
