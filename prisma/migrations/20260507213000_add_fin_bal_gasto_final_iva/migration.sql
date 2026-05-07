-- Agrega política de IVA por gasto final a `fin_bal_gasto_final`.
--
-- Modelo de datos:
--   * Reutiliza el enum PostgreSQL "IvaProveedor" creado por la migración
--     `20260507193000_add_global_proveedores_iva` (SIEMPRE | NUNCA | PREGUNTA).
--     No se crea un enum nuevo: la política de IVA es transversal y se mantiene
--     en un único tipo Postgres (ver BACKEND_GUIDELINES.md §1.11d).
--   * Columna `fin_bal_gasto_final.iva` NOT NULL DEFAULT 'PREGUNTA'.
--     - Default conservador: ningún gasto final pre-existente asume política.
--     - El DEFAULT 'PREGUNTA' aplica como backfill in-place al ADD COLUMN
--       (PostgreSQL 11+ no reescribe la tabla cuando el default es estático).
--
-- Sin índice: cardinalidad = 3, no se usa como predicado masivo de listados
-- (mismo criterio que `global_proveedores.iva`).
--
-- Idempotencia:
--   * ADD COLUMN IF NOT EXISTS.
--   * El enum se asume creado por la migración previa; si por algún motivo
--     ese paso fue revertido, el ADD COLUMN fallaría con UndefinedObject —
--     en ese caso el orden correcto sigue siendo el del histórico (Prisma no
--     ejecuta migraciones fuera de orden).

ALTER TABLE "fin_bal_gasto_final"
  ADD COLUMN IF NOT EXISTS "iva" "IvaProveedor" NOT NULL DEFAULT 'PREGUNTA';
