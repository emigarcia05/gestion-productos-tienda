-- Fecha de recepción (FECHA FACTURA del modal), calendario DATE.
-- Backfill: día AR de registrado_at en pedidos ya RECEPCIONADO.

ALTER TABLE "prod_ped_historial"
  ADD COLUMN IF NOT EXISTS "fecha_recepcion" DATE;

UPDATE "prod_ped_historial"
SET "fecha_recepcion" = ("registrado_at" AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
WHERE "estado" = 'RECEPCIONADO'
  AND "registrado_at" IS NOT NULL
  AND "fecha_recepcion" IS NULL;
