-- Contenido pasa a catálogo global; permitidos tipo↔contenido vía tabla puente N:M.

CREATE TABLE IF NOT EXISTS "mkt_publicaciones_tipo_contenido" (
    "tipo_publicacion_id" TEXT NOT NULL,
    "contenido_tipo_id" TEXT NOT NULL,

    CONSTRAINT "mkt_publicaciones_tipo_contenido_pkey"
        PRIMARY KEY ("tipo_publicacion_id", "contenido_tipo_id")
);

-- Volcar vínculos 1:N previos a la puente (columna de la migración 20260714120000).
INSERT INTO "mkt_publicaciones_tipo_contenido" ("tipo_publicacion_id", "contenido_tipo_id")
SELECT DISTINCT "tipo_publicacion_id", "id"
FROM "mkt_publicaciones_contenido_tipo"
ON CONFLICT DO NOTHING;

ALTER TABLE "mkt_publicaciones_contenido_tipo"
    DROP CONSTRAINT IF EXISTS "mkt_publicaciones_contenido_tipo_tipo_publicacion_id_fkey";

DROP INDEX IF EXISTS "mkt_publicaciones_contenido_tipo_tipo_nombre_ux";
DROP INDEX IF EXISTS "mkt_publicaciones_contenido_tipo_tipo_idx";

ALTER TABLE "mkt_publicaciones_contenido_tipo"
    DROP COLUMN IF EXISTS "tipo_publicacion_id";

-- Homónimos: consolidar al id lexicográficamente menor.
DO $$
DECLARE
  r RECORD;
  keeper TEXT;
BEGIN
  FOR r IN
    SELECT "contenido_nombre" AS nombre
    FROM "mkt_publicaciones_contenido_tipo"
    GROUP BY "contenido_nombre"
    HAVING COUNT(*) > 1
  LOOP
    SELECT MIN("id") INTO keeper
    FROM "mkt_publicaciones_contenido_tipo"
    WHERE "contenido_nombre" = r.nombre;

    UPDATE "mkt_publicaciones_tipo_contenido" t
    SET "contenido_tipo_id" = keeper
    WHERE "contenido_tipo_id" IN (
      SELECT "id" FROM "mkt_publicaciones_contenido_tipo"
      WHERE "contenido_nombre" = r.nombre AND "id" <> keeper
    )
    AND NOT EXISTS (
      SELECT 1 FROM "mkt_publicaciones_tipo_contenido" x
      WHERE x."tipo_publicacion_id" = t."tipo_publicacion_id"
        AND x."contenido_tipo_id" = keeper
    );

    DELETE FROM "mkt_publicaciones_tipo_contenido"
    WHERE "contenido_tipo_id" IN (
      SELECT "id" FROM "mkt_publicaciones_contenido_tipo"
      WHERE "contenido_nombre" = r.nombre AND "id" <> keeper
    );

    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'mkt_publicaciones'
    ) THEN
      UPDATE "mkt_publicaciones"
      SET "tipo_contenido_id" = keeper
      WHERE "tipo_contenido_id" IN (
        SELECT "id" FROM "mkt_publicaciones_contenido_tipo"
        WHERE "contenido_nombre" = r.nombre AND "id" <> keeper
      );
    END IF;

    DELETE FROM "mkt_publicaciones_contenido_tipo"
    WHERE "contenido_nombre" = r.nombre AND "id" <> keeper;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "mkt_publicaciones_contenido_tipo_contenido_nombre_key"
    ON "mkt_publicaciones_contenido_tipo"("contenido_nombre");

ALTER TABLE "mkt_publicaciones_tipo_contenido"
    DROP CONSTRAINT IF EXISTS "mkt_publicaciones_tipo_contenido_tipo_publicacion_id_fkey";
ALTER TABLE "mkt_publicaciones_tipo_contenido"
    DROP CONSTRAINT IF EXISTS "mkt_publicaciones_tipo_contenido_contenido_tipo_id_fkey";

ALTER TABLE "mkt_publicaciones_tipo_contenido"
    ADD CONSTRAINT "mkt_publicaciones_tipo_contenido_tipo_publicacion_id_fkey"
        FOREIGN KEY ("tipo_publicacion_id") REFERENCES "mkt_publicaciones_tipo"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mkt_publicaciones_tipo_contenido"
    ADD CONSTRAINT "mkt_publicaciones_tipo_contenido_contenido_tipo_id_fkey"
        FOREIGN KEY ("contenido_tipo_id") REFERENCES "mkt_publicaciones_contenido_tipo"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "mkt_publicaciones_tipo_contenido_contenido_idx"
    ON "mkt_publicaciones_tipo_contenido"("contenido_tipo_id");
