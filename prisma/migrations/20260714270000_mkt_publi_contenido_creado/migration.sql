-- Contiene creado (SI/NO) en hechos de publicación.
ALTER TABLE "mkt_publi"
  ADD COLUMN "contenido_creado" BOOLEAN NOT NULL DEFAULT false;
