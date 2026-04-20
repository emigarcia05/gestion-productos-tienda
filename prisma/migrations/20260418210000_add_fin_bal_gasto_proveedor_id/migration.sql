-- Agrega FK opcional `fin_bal_gasto.proveedor_id` → `proveedores.id`.
--
-- Diseño:
--   * NULLable: los gastos existentes no tienen proveedor asignado (no hay backfill posible)
--     y semánticamente un gasto del catálogo puede ser "genérico" (sueldos, servicios propios, etc.).
--   * onDelete: SET NULL → si se borra un proveedor, el nodo del catálogo sobrevive con
--     `proveedor_id = NULL`. Nunca Cascade (destruiría el catálogo maestro), nunca Restrict
--     (bloquearía dar de baja proveedores legítimamente).
--   * onUpdate: CASCADE → sigue el id del proveedor si cambiara (default Prisma, casi un no-op con cuid).
--   * Índice sobre `proveedor_id` para acelerar joins y filtros por proveedor.

ALTER TABLE "fin_bal_gasto"
    ADD COLUMN "proveedor_id" TEXT;

CREATE INDEX "fin_bal_gasto_proveedor_id_idx"
    ON "fin_bal_gasto"("proveedor_id");

ALTER TABLE "fin_bal_gasto"
    ADD CONSTRAINT "fin_bal_gasto_proveedor_id_fkey"
    FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
