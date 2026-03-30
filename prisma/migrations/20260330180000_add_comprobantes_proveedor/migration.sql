-- Comprobantes de compra (API DUX); FK a proveedores por id_proveedor_dux (único).
-- Antes de aplicar: asegurar que no haya dos filas en proveedores con el mismo id_proveedor_dux no nulo.

CREATE UNIQUE INDEX "proveedores_id_proveedor_dux_key" ON "proveedores"("id_proveedor_dux");

CREATE TABLE "comprobantes_proveedor" (
    "id" TEXT NOT NULL,
    "tipo_comprobante" TEXT NOT NULL,
    "comprobante" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "id_proveedor_dux" TEXT NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "monto_pagado" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comprobantes_proveedor_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "comprobantes_proveedor" ADD CONSTRAINT "comprobantes_proveedor_id_proveedor_dux_fkey"
FOREIGN KEY ("id_proveedor_dux") REFERENCES "proveedores"("id_proveedor_dux") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "comprobantes_proveedor_fecha_idx" ON "comprobantes_proveedor"("fecha");
CREATE INDEX "comprobantes_proveedor_id_proveedor_dux_idx" ON "comprobantes_proveedor"("id_proveedor_dux");
