-- Permite cant_recibida NULL hasta que en recepción se registre la cantidad recibida.
ALTER TABLE "pedidos_historia_items" ALTER COLUMN "cant_recibida" DROP DEFAULT;
ALTER TABLE "pedidos_historia_items" ALTER COLUMN "cant_recibida" DROP NOT NULL;
