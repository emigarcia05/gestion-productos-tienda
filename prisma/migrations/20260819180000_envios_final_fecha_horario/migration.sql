-- Fecha de envío (calendario AR) y rango horario 09:00–19:00 en saltos de 30 min.
ALTER TABLE "envios_final"
ADD COLUMN "fecha_envio" DATE,
ADD COLUMN "hora_desde" VARCHAR(5),
ADD COLUMN "hora_hasta" VARCHAR(5);

UPDATE "envios_final"
SET
  "fecha_envio" = ("created_at" AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
  "hora_desde" = '09:00',
  "hora_hasta" = '19:00'
WHERE "fecha_envio" IS NULL;

ALTER TABLE "envios_final"
ALTER COLUMN "fecha_envio" SET NOT NULL,
ALTER COLUMN "hora_desde" SET NOT NULL,
ALTER COLUMN "hora_hasta" SET NOT NULL;

ALTER TABLE "envios_final"
ADD CONSTRAINT "envios_final_hora_desde_chk"
CHECK (
  "hora_desde" IN (
    '09:00','09:30','10:00','10:30','11:00','11:30',
    '12:00','12:30','13:00','13:30','14:00','14:30',
    '15:00','15:30','16:00','16:30','17:00','17:30',
    '18:00','18:30','19:00'
  )
);

ALTER TABLE "envios_final"
ADD CONSTRAINT "envios_final_hora_hasta_chk"
CHECK (
  "hora_hasta" IN (
    '09:00','09:30','10:00','10:30','11:00','11:30',
    '12:00','12:30','13:00','13:30','14:00','14:30',
    '15:00','15:30','16:00','16:30','17:00','17:30',
    '18:00','18:30','19:00'
  )
);

ALTER TABLE "envios_final"
ADD CONSTRAINT "envios_final_horario_orden_chk"
CHECK ("hora_desde" < "hora_hasta");

CREATE INDEX "envios_final_fecha_envio_idx" ON "envios_final"("fecha_envio");
