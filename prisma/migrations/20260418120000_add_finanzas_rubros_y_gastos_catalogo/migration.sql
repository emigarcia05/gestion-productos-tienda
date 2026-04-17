-- Catálogo finanzas: rubros y gastos (rubro + tipo VARIABLE|FIJO + nombre único por combinación).

CREATE TYPE "TipoCostoGasto" AS ENUM ('VARIABLE', 'FIJO');

CREATE TABLE "finanzas_rubros" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finanzas_rubros_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "finanzas_rubros_nombre_key" ON "finanzas_rubros"("nombre");

CREATE TABLE "finanzas_gastos" (
    "id" TEXT NOT NULL,
    "rubro_id" TEXT NOT NULL,
    "tipo_costo" "TipoCostoGasto" NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finanzas_gastos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "finanzas_gastos_rubro_tipo_nombre_ux" ON "finanzas_gastos"("rubro_id", "tipo_costo", "nombre");

CREATE INDEX "finanzas_gastos_rubro_id_idx" ON "finanzas_gastos"("rubro_id");

ALTER TABLE "finanzas_gastos"
ADD CONSTRAINT "finanzas_gastos_rubro_id_fkey"
FOREIGN KEY ("rubro_id") REFERENCES "finanzas_rubros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
