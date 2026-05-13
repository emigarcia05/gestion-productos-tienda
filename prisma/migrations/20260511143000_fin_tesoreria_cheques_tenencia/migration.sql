-- Custodia del cheque (tienda / depositado en cuenta propia / entregado a proveedor).
CREATE TYPE "TenenciaChequeTesoreria" AS ENUM ('TIENDA', 'DEPOSITADO', 'PROVEEDOR');

ALTER TABLE "fin_tesoreria_cheques"
ADD COLUMN "tenencia" "TenenciaChequeTesoreria" NOT NULL DEFAULT 'TIENDA';

UPDATE "fin_tesoreria_cheques"
SET "tenencia" = 'DEPOSITADO'
WHERE "fecha_transferencia" IS NOT NULL;

UPDATE "fin_tesoreria_cheques"
SET "tenencia" = 'PROVEEDOR'
WHERE "entrega_proveedor" IS NOT NULL
  AND "fecha_transferencia" IS NULL;
