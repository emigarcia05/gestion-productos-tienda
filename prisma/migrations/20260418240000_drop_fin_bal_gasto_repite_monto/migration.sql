-- Baja de la columna `fin_bal_gasto.repite_monto`.
--
-- Contexto:
--   La columna fue introducida en la migración
--   `20260418220000_add_fin_bal_gasto_flags_mensual_repite` junto con
--   `gasto_mensual`. Se decide removerla porque el flag no se está usando en
--   ningún flujo persistido (todos los registros conservan el DEFAULT FALSE) y
--   el caso de uso se cubre a nivel de movimiento (`movimientos_finanzas`),
--   no del catálogo maestro.
--
--   `gasto_mensual` se mantiene: sigue siendo relevante para diferenciar
--   gastos recurrentes dentro del catálogo.
--
-- Idempotente (IF EXISTS) y seguro: la columna no tiene FKs ni es parte de
-- ningún índice o constraint.

ALTER TABLE "fin_bal_gasto"
    DROP COLUMN IF EXISTS "repite_monto";
