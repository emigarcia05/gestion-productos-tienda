-- Flag: sucursal que participa en Estadísticas Productos / Carga de Datos.
ALTER TABLE "global_sucursales" ADD COLUMN "genera_est" BOOLEAN NOT NULL DEFAULT false;

-- Conservar comportamiento previo: quienes tenían depósito configurado siguen
-- apareciendo en Carga de Datos hasta ajuste manual.
UPDATE "global_sucursales"
SET "genera_est" = true
WHERE "deposito" IS NOT NULL AND btrim("deposito") <> '';
