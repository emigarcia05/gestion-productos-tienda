-- Movimientos de finanzas por sucursal + detalle de cheques (1:N).

CREATE TYPE "TipoMovimientoFinanzas" AS ENUM ('EFECTIVO', 'BANCO', 'CHEQUE');

CREATE TABLE "movimientos_finanzas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoMovimientoFinanzas" NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimientos_finanzas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "movimientos_finanzas_cheques" (
    "id" TEXT NOT NULL,
    "movimiento_finanzas_id" TEXT NOT NULL,
    "fecha_cobro" DATE NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimientos_finanzas_cheques_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "movimientos_finanzas_sucursal_id_tipo_idx"
ON "movimientos_finanzas"("sucursal_id", "tipo");

CREATE INDEX "movimientos_finanzas_cheques_movimiento_finanzas_id_fecha_cobro_idx"
ON "movimientos_finanzas_cheques"("movimiento_finanzas_id", "fecha_cobro");

ALTER TABLE "movimientos_finanzas"
ADD CONSTRAINT "movimientos_finanzas_sucursal_id_fkey"
FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "movimientos_finanzas_cheques"
ADD CONSTRAINT "movimientos_finanzas_cheques_movimiento_finanzas_id_fkey"
FOREIGN KEY ("movimiento_finanzas_id") REFERENCES "movimientos_finanzas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
