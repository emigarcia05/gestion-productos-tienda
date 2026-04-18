-- Baja del catálogo finanzas (rubros y gastos) y su enum TipoCostoGasto.
-- Idempotente: tolera ejecución en entornos donde las tablas o el tipo ya no existan.
-- Orden: primero la tabla hija (finanzas_gastos, FK a finanzas_rubros), luego la padre,
-- y por último el tipo enum una vez que ninguna columna lo referencia.

DROP TABLE IF EXISTS "finanzas_gastos" CASCADE;
DROP TABLE IF EXISTS "finanzas_rubros" CASCADE;
DROP TYPE IF EXISTS "TipoCostoGasto";
