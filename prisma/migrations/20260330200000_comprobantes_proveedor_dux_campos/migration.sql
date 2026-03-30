-- Alineación con campos API DUX compras + clave natural para upsert de sync.

ALTER TABLE "comprobantes_proveedor" DROP CONSTRAINT IF EXISTS "comprobantes_proveedor_id_proveedor_dux_fkey";

ALTER TABLE "comprobantes_proveedor" RENAME COLUMN "tipo_comprobante" TO "tipo_comp";
ALTER TABLE "comprobantes_proveedor" RENAME COLUMN "fecha" TO "fecha_comp";
ALTER TABLE "comprobantes_proveedor" RENAME COLUMN "id_proveedor_dux" TO "id_proveedor";
ALTER TABLE "comprobantes_proveedor" RENAME COLUMN "monto_pagado" TO "monto_aplicado";

ALTER TABLE "comprobantes_proveedor" ADD COLUMN "id_sucursal_empresa" TEXT NOT NULL DEFAULT '';

DROP INDEX IF EXISTS "comprobantes_proveedor_fecha_idx";
DROP INDEX IF EXISTS "comprobantes_proveedor_id_proveedor_dux_idx";

CREATE INDEX "comprobantes_proveedor_fecha_comp_idx" ON "comprobantes_proveedor"("fecha_comp");
CREATE INDEX "comprobantes_proveedor_id_proveedor_idx" ON "comprobantes_proveedor"("id_proveedor");

ALTER TABLE "comprobantes_proveedor" ADD CONSTRAINT "comprobantes_proveedor_id_proveedor_fkey"
FOREIGN KEY ("id_proveedor") REFERENCES "proveedores"("id_proveedor_dux") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "comprobantes_proveedor_natural_ux"
ON "comprobantes_proveedor"("id_sucursal_empresa", "tipo_comp", "comprobante", "fecha_comp", "id_proveedor");

ALTER TABLE "comprobantes_proveedor" ALTER COLUMN "id_sucursal_empresa" DROP DEFAULT;
