-- Catálogo de depósitos: prod_depositos_dux → global_depositos.
-- Relación 1 sucursal → 1 depósito (global_sucursales.id_deposito). Corporativo queda NULL.

ALTER TABLE "prod_depositos_dux" RENAME TO "global_depositos";

ALTER TABLE "global_depositos" RENAME CONSTRAINT "prod_depositos_dux_pkey" TO "global_depositos_pkey";

ALTER TABLE "global_sucursales" ADD COLUMN "id_deposito" INTEGER;

UPDATE "global_sucursales" SET "id_deposito" = 4565 WHERE "codigo" = 'guaymallen';
UPDATE "global_sucursales" SET "id_deposito" = 16923 WHERE "codigo" = 'maipu';

ALTER TABLE "global_sucursales"
  ADD CONSTRAINT "global_sucursales_id_deposito_key" UNIQUE ("id_deposito");

ALTER TABLE "global_sucursales"
  ADD CONSTRAINT "global_sucursales_id_deposito_fkey"
  FOREIGN KEY ("id_deposito") REFERENCES "global_depositos" ("id_deposito")
  ON DELETE RESTRICT ON UPDATE CASCADE;
