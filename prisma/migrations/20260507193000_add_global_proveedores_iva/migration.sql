-- Agrega política de IVA por proveedor a `global_proveedores`.
--
-- Modelo de datos:
--   * Enum PostgreSQL "IvaProveedor" con 3 valores cerrados: SIEMPRE | NUNCA | PREGUNTA.
--     - SIEMPRE  : el proveedor SIEMPRE factura con IVA.
--     - NUNCA    : el proveedor NUNCA factura con IVA.
--     - PREGUNTA : política indefinida; la UI/flujo debe preguntar caso por caso.
--   * Columna `global_proveedores.iva` NOT NULL DEFAULT 'PREGUNTA'.
--     - Default conservador: no asume política comercial sobre proveedores existentes.
--     - El DEFAULT 'PREGUNTA' aplica también como backfill in-place al ADD COLUMN
--       (PostgreSQL 11+ no reescribe la tabla cuando el default es estático).
--
-- Sin índice: cardinalidad = 3, no se usa como predicado masivo de listados
-- (mismo criterio aplicado a `global_sucursales.centro_costo`).
--
-- Idempotencia:
--   * CREATE TYPE envuelto en bloque DO + EXCEPTION duplicate_object.
--   * ADD COLUMN IF NOT EXISTS.

DO $$ BEGIN
  CREATE TYPE "IvaProveedor" AS ENUM ('SIEMPRE', 'NUNCA', 'PREGUNTA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "global_proveedores"
  ADD COLUMN IF NOT EXISTS "iva" "IvaProveedor" NOT NULL DEFAULT 'PREGUNTA';
