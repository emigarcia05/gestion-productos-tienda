-- Agrega `proveedor_mercaderia` a `proveedores`: flag booleano que marca al proveedor
-- como "de mercadería". Solo los TRUE se listan en /gestion-productos/proveedores/lista.
--
-- Estrategia de backfill sin ventana de inconsistencia:
--   1) ADD COLUMN con DEFAULT true  → todos los proveedores existentes quedan en true
--      (preserva el comportamiento previo de la lista: nadie desaparece de golpe).
--   2) ALTER COLUMN SET DEFAULT false → a partir de ahora, los proveedores NUEVOS son
--      opt-in: no aparecen en la lista de mercadería hasta marcarlos explícitamente.
--   3) CREATE INDEX para acelerar el filtro `WHERE proveedor_mercaderia = true`
--      del listado.

ALTER TABLE "proveedores"
    ADD COLUMN "proveedor_mercaderia" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "proveedores"
    ALTER COLUMN "proveedor_mercaderia" SET DEFAULT false;

CREATE INDEX "proveedores_proveedor_mercaderia_idx"
    ON "proveedores"("proveedor_mercaderia");
