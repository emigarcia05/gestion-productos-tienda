-- Flag: sucursal que participa en balance / gastos finales de catálogo.
ALTER TABLE "global_sucursales" ADD COLUMN "genera_balance" BOOLEAN NOT NULL DEFAULT false;

-- Conservar comportamiento previo: quien ya era centro de costo sigue apareciendo en balance hasta que se ajuste manualmente.
UPDATE "global_sucursales" SET "genera_balance" = true WHERE "centro_costo" = true;
