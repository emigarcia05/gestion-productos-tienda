DROP INDEX IF EXISTS "cajas_tesoreria_nombre_caja_key";

CREATE UNIQUE INDEX IF NOT EXISTS "cajas_tesoreria_nombre_titular_ux"
ON "cajas_tesoreria" ("nombre_caja", "titular");
