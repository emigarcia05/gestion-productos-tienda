-- Columnas de hecho de publicación: día de calendario + texto.
ALTER TABLE "mkt_publi"
  ADD COLUMN "fecha" DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN "publicacion" TEXT NOT NULL DEFAULT '';

ALTER TABLE "mkt_publi"
  ALTER COLUMN "fecha" DROP DEFAULT;

CREATE INDEX "mkt_publi_fecha_idx" ON "mkt_publi"("fecha");
