-- Ideas detalle: quitar tipo de contenido y flag usada.
-- `usada` pasa a derivarse de la relación 1:1 con `mkt_publi.idea_detalle_id`.
-- Se conserva `seccion_id` para filtrar/crear ideas por sección en Calendario.

DROP INDEX IF EXISTS "mkt_publi_ideas_detalle_contenido_idx";
DROP INDEX IF EXISTS "mkt_publi_ideas_detalle_usada_idx";

ALTER TABLE "mkt_publi_ideas_detalle" DROP CONSTRAINT IF EXISTS "mkt_publi_ideas_detalle_tipo_contenido_id_fkey";

ALTER TABLE "mkt_publi_ideas_detalle" DROP COLUMN IF EXISTS "tipo_contenido_id";
ALTER TABLE "mkt_publi_ideas_detalle" DROP COLUMN IF EXISTS "usada";
