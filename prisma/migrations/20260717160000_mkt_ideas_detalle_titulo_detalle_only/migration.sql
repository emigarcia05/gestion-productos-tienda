-- Detalle de idea: tipo de contenido opcional (alta solo con título + detalle).
ALTER TABLE "mkt_publi_ideas_detalle" ALTER COLUMN "tipo_contenido_id" DROP NOT NULL;
