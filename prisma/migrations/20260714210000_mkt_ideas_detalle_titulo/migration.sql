-- Título corto de la idea en detalle.

ALTER TABLE "mkt_publicaciones_ideas_detalle"
    ADD COLUMN "titulo_idea" TEXT NOT NULL DEFAULT '';

ALTER TABLE "mkt_publicaciones_ideas_detalle"
    ALTER COLUMN "titulo_idea" DROP DEFAULT;
