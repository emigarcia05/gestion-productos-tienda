-- `clientes`: nombre + apellido → nombre_completo.

UPDATE "clientes"
SET "nombre" = TRIM(BOTH FROM CONCAT("apellido", ' ', "nombre"));

DROP INDEX IF EXISTS "clientes_apellido_nombre_idx";

ALTER TABLE "clientes" DROP COLUMN "apellido";
ALTER TABLE "clientes" RENAME COLUMN "nombre" TO "nombre_completo";

CREATE INDEX "clientes_nombre_completo_idx" ON "clientes"("nombre_completo");
