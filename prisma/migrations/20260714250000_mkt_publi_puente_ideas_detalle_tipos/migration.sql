-- Renombre puente N:M ideas detalle ↔ tipos de publicación.
ALTER TABLE "mkt_publicaciones_ideas_detalle_tipos" RENAME TO "mkt_publi_puente_ideas_detalle_tipos";

ALTER TABLE "mkt_publi_puente_ideas_detalle_tipos"
  RENAME CONSTRAINT "mkt_publicaciones_ideas_detalle_tipos_pkey"
  TO "mkt_publi_puente_ideas_detalle_tipos_pkey";

ALTER TABLE "mkt_publi_puente_ideas_detalle_tipos"
  RENAME CONSTRAINT "mkt_publi_ideas_detalle_tipos_idea_detalle_id_fkey"
  TO "mkt_publi_puente_ideas_detalle_tipos_idea_detalle_id_fkey";

ALTER TABLE "mkt_publi_puente_ideas_detalle_tipos"
  RENAME CONSTRAINT "mkt_publi_ideas_detalle_tipos_tipo_publicacion_id_fkey"
  TO "mkt_publi_puente_ideas_detalle_tipos_tipo_publicacion_id_fkey";

ALTER INDEX "mkt_ideas_detalle_tipo_tipo_idx"
  RENAME TO "mkt_publi_puente_ideas_detalle_tipos_tipo_idx";
