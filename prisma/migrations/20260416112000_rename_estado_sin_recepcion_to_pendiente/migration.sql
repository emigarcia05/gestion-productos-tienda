UPDATE "pedidos_historia"
SET "estado" = 'PENDIENTE'
WHERE "estado" = 'SIN RECEPCION';

ALTER TABLE "pedidos_historia"
ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';
