-- URL de Drive del contenido creado; vacío = contenido_creado false.
ALTER TABLE "mkt_publi"
  ADD COLUMN "contenido_url" TEXT NOT NULL DEFAULT '';

-- Alinear el booleano histórico con la nueva fuente de verdad (URL).
UPDATE "mkt_publi"
SET "contenido_creado" = (LENGTH(TRIM("contenido_url")) > 0);
