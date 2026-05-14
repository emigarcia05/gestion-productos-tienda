-- Catálogo de entidades de tesorería (`fin_tesoreria_entidades`).
-- `fin_tesoreria.nombre_caja` se reemplaza por `entidad_id` → FK al catálogo.

CREATE TABLE "fin_tesoreria_entidades" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_tesoreria_entidades_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fin_tesoreria_entidades_nombre_key" ON "fin_tesoreria_entidades"("nombre");

-- Valores predeterminados (MAYÚSCULAS; alineado a datos históricos comunes).
INSERT INTO "fin_tesoreria_entidades" ("id", "nombre", "created_at", "updated_at")
VALUES
    (gen_random_uuid()::text, 'BANCO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'CHEQUES', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'EFECTIVO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'MERCADOPAGO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'MERCADOPAGO - A ACREDITAR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Una fila por cada `nombre_caja` distinto aún no presente en el catálogo.
INSERT INTO "fin_tesoreria_entidades" ("id", "nombre", "created_at", "updated_at")
SELECT gen_random_uuid()::text, upper(trim(d."nombre_caja")), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "nombre_caja" FROM "fin_tesoreria") AS d
WHERE NOT EXISTS (
    SELECT 1 FROM "fin_tesoreria_entidades" e WHERE e."nombre" = upper(trim(d."nombre_caja"))
);

ALTER TABLE "fin_tesoreria" ADD COLUMN "entidad_id" TEXT;

UPDATE "fin_tesoreria" AS t
SET "entidad_id" = e."id"
FROM "fin_tesoreria_entidades" AS e
WHERE e."nombre" = upper(trim(t."nombre_caja"));

ALTER TABLE "fin_tesoreria" ALTER COLUMN "entidad_id" SET NOT NULL;

DROP INDEX IF EXISTS "fin_tesoreria_nombre_titular_ux";

ALTER TABLE "fin_tesoreria" DROP COLUMN "nombre_caja";

CREATE UNIQUE INDEX "fin_tesoreria_entidad_titular_ux" ON "fin_tesoreria"("entidad_id", "titular");

ALTER TABLE "fin_tesoreria"
    ADD CONSTRAINT "fin_tesoreria_entidad_id_fkey"
    FOREIGN KEY ("entidad_id") REFERENCES "fin_tesoreria_entidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "fin_tesoreria_entidad_id_idx" ON "fin_tesoreria"("entidad_id");
