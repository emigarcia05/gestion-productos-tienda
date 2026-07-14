-- Vincula hechos de calendario con ideas de detalle (1:1 opcional).
ALTER TABLE "mkt_publi"
  ADD COLUMN "idea_detalle_id" TEXT;

CREATE UNIQUE INDEX "mkt_publi_idea_detalle_id_key" ON "mkt_publi"("idea_detalle_id");

ALTER TABLE "mkt_publi"
  ADD CONSTRAINT "mkt_publi_idea_detalle_id_fkey"
  FOREIGN KEY ("idea_detalle_id") REFERENCES "mkt_publi_ideas_detalle"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
