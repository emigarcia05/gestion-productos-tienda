-- Catálogo de tipos Base Multimedia + FK en mkt_contenido_url_drive.

CREATE TABLE "mkt_contenido_drive_tipo" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mkt_contenido_drive_tipo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mkt_contenido_drive_tipo_tipo_key" ON "mkt_contenido_drive_tipo"("tipo");

ALTER TABLE "mkt_contenido_url_drive" ADD COLUMN "tipo_id" TEXT;

-- Si ya hay filas, asignar un tipo placeholder para poder forzar NOT NULL.
INSERT INTO "mkt_contenido_drive_tipo" ("id", "tipo", "created_at", "updated_at")
SELECT 'mkt_drive_tipo_sin_clasificar', 'SIN CLASIFICAR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "mkt_contenido_url_drive" WHERE "tipo_id" IS NULL)
  AND NOT EXISTS (SELECT 1 FROM "mkt_contenido_drive_tipo" WHERE "tipo" = 'SIN CLASIFICAR');

UPDATE "mkt_contenido_url_drive"
SET "tipo_id" = (
  SELECT "id" FROM "mkt_contenido_drive_tipo" WHERE "tipo" = 'SIN CLASIFICAR' LIMIT 1
)
WHERE "tipo_id" IS NULL
  AND EXISTS (SELECT 1 FROM "mkt_contenido_drive_tipo" WHERE "tipo" = 'SIN CLASIFICAR');

-- Sin filas huérfanas: permitir NOT NULL. Si la tabla está vacía, igual se exige tipo al crear.
DELETE FROM "mkt_contenido_url_drive" WHERE "tipo_id" IS NULL;

ALTER TABLE "mkt_contenido_url_drive"
  ALTER COLUMN "tipo_id" SET NOT NULL;

ALTER TABLE "mkt_contenido_url_drive"
  ADD CONSTRAINT "mkt_contenido_url_drive_tipo_id_fkey"
  FOREIGN KEY ("tipo_id") REFERENCES "mkt_contenido_drive_tipo"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "mkt_contenido_url_drive_tipo_idx" ON "mkt_contenido_url_drive"("tipo_id");
