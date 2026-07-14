-- Quitar puente N:M entre tipo de publicación y tipo de contenido.
-- Los tres catálogos quedan independientes (solo vinculados vía hechos `mkt_publicaciones`).

DROP TABLE IF EXISTS "mkt_publicaciones_tipo_contenido";
