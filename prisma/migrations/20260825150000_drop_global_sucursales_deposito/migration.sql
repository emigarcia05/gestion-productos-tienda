-- Columna de texto obsoleta: el depósito de la sucursal es `id_deposito` (FK a global_depositos).

ALTER TABLE "global_sucursales" DROP COLUMN "deposito";
