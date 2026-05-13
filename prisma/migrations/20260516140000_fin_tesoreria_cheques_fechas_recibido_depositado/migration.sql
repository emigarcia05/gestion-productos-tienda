-- Fechas de negocio; se elimina FK a proveedor de entrega (posteriores a alta de entrega_proveedor).
ALTER TABLE "fin_tesoreria_cheques" ADD COLUMN "fecha_recibido" DATE;
ALTER TABLE "fin_tesoreria_cheques" ADD COLUMN "fecha_depositado" DATE;

UPDATE "fin_tesoreria_cheques"
SET "fecha_recibido" = ("created_at" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
WHERE "fecha_recibido" IS NULL;

UPDATE "fin_tesoreria_cheques"
SET "fecha_depositado" = ("fecha_transferencia" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
WHERE "fecha_transferencia" IS NOT NULL;

ALTER TABLE "fin_tesoreria_cheques" ALTER COLUMN "fecha_recibido" SET NOT NULL;

ALTER TABLE "fin_tesoreria_cheques" DROP CONSTRAINT IF EXISTS "fin_tesoreria_cheques_entrega_proveedor_fkey";
DROP INDEX IF EXISTS "fin_tesoreria_cheques_entrega_proveedor_idx";
ALTER TABLE "fin_tesoreria_cheques" DROP COLUMN IF EXISTS "entrega_proveedor";
