-- Quitar catálogo `mkt_publi_tipo_publicacion` y usos relacionados.
-- Publicaciones existentes se eliminan (aceptado: datos de prueba / no necesarios).

-- Liberar ideas vinculadas y borrar hechos de publicación
UPDATE "mkt_publi_ideas_detalle" AS d
SET "usada" = false
FROM "mkt_publi" AS p
WHERE p."idea_detalle_id" = d."id";

DELETE FROM "mkt_publi";

-- Puente N:M ideas ↔ tipo publicación
DROP TABLE IF EXISTS "mkt_publi_puente_ideas_detalle_tipos";

-- Columna FK en hechos
ALTER TABLE "mkt_publi" DROP CONSTRAINT IF EXISTS "mkt_publi_tipo_publicacion_id_fkey";
DROP INDEX IF EXISTS "mkt_publi_tipo_idx";
ALTER TABLE "mkt_publi" DROP COLUMN IF EXISTS "tipo_publicacion_id";

-- Catálogo
DROP TABLE IF EXISTS "mkt_publi_tipo_publicacion";
