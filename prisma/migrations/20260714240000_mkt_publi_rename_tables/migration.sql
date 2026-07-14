-- Renombre tablas Marketing · Publicaciones / Ideas (`mkt_publicaciones*` → `mkt_publi*`).

ALTER TABLE "mkt_publicaciones_redes" RENAME TO "mkt_publi_tipo_redes";
ALTER TABLE "mkt_publicaciones_tipo" RENAME TO "mkt_publi_tipo_publicacion";
ALTER TABLE "mkt_publicaciones_contenido_tipo" RENAME TO "mkt_publi_tipo_contenido";
ALTER TABLE "mkt_publicaciones" RENAME TO "mkt_publi";
ALTER TABLE "mkt_publicaciones_ideas_secciones" RENAME TO "mkt_publi_ideas_secciones";
ALTER TABLE "mkt_publicaciones_ideas_detalle" RENAME TO "mkt_publi_ideas_detalle";

-- PK
ALTER TABLE "mkt_publi_tipo_redes" RENAME CONSTRAINT "mkt_publicaciones_redes_pkey" TO "mkt_publi_tipo_redes_pkey";
ALTER TABLE "mkt_publi_tipo_publicacion" RENAME CONSTRAINT "mkt_publicaciones_tipo_pkey" TO "mkt_publi_tipo_publicacion_pkey";
ALTER TABLE "mkt_publi_tipo_contenido" RENAME CONSTRAINT "mkt_publicaciones_contenido_tipo_pkey" TO "mkt_publi_tipo_contenido_pkey";
ALTER TABLE "mkt_publi" RENAME CONSTRAINT "mkt_publicaciones_pkey" TO "mkt_publi_pkey";
ALTER TABLE "mkt_publi_ideas_secciones" RENAME CONSTRAINT "mkt_publicaciones_ideas_secciones_pkey" TO "mkt_publi_ideas_secciones_pkey";
ALTER TABLE "mkt_publi_ideas_detalle" RENAME CONSTRAINT "mkt_publicaciones_ideas_detalle_pkey" TO "mkt_publi_ideas_detalle_pkey";

-- Unique indexes
ALTER INDEX "mkt_publicaciones_redes_red_social_nombre_key" RENAME TO "mkt_publi_tipo_redes_red_social_nombre_key";
ALTER INDEX "mkt_publicaciones_tipo_tipo_publicacion_nombre_key" RENAME TO "mkt_publi_tipo_publicacion_nombre_key";
ALTER INDEX "mkt_publicaciones_contenido_tipo_contenido_nombre_key" RENAME TO "mkt_publi_tipo_contenido_contenido_nombre_key";
ALTER INDEX "mkt_publicaciones_ideas_secciones_idea_nombre_key" RENAME TO "mkt_publi_ideas_secciones_idea_nombre_key";

-- Indexes hechos / ideas
ALTER INDEX "mkt_publicaciones_red_idx" RENAME TO "mkt_publi_red_idx";
ALTER INDEX "mkt_publicaciones_tipo_idx" RENAME TO "mkt_publi_tipo_idx";
ALTER INDEX "mkt_publicaciones_contenido_idx" RENAME TO "mkt_publi_contenido_idx";
ALTER INDEX "mkt_publicaciones_ideas_detalle_seccion_idx" RENAME TO "mkt_publi_ideas_detalle_seccion_idx";
ALTER INDEX "mkt_publicaciones_ideas_detalle_contenido_idx" RENAME TO "mkt_publi_ideas_detalle_contenido_idx";
ALTER INDEX "mkt_publicaciones_ideas_detalle_usada_idx" RENAME TO "mkt_publi_ideas_detalle_usada_idx";

-- FK hechos `mkt_publi`
ALTER TABLE "mkt_publi" RENAME CONSTRAINT "mkt_publicaciones_red_id_fkey" TO "mkt_publi_red_id_fkey";
ALTER TABLE "mkt_publi" RENAME CONSTRAINT "mkt_publicaciones_tipo_publicacion_id_fkey" TO "mkt_publi_tipo_publicacion_id_fkey";
ALTER TABLE "mkt_publi" RENAME CONSTRAINT "mkt_publicaciones_tipo_contenido_id_fkey" TO "mkt_publi_tipo_contenido_id_fkey";

-- FK ideas
ALTER TABLE "mkt_publi_ideas_detalle" RENAME CONSTRAINT "mkt_publicaciones_ideas_detalle_seccion_id_fkey" TO "mkt_publi_ideas_detalle_seccion_id_fkey";
ALTER TABLE "mkt_publi_ideas_detalle" RENAME CONSTRAINT "mkt_publicaciones_ideas_detalle_tipo_contenido_id_fkey" TO "mkt_publi_ideas_detalle_tipo_contenido_id_fkey";

-- FK puentes N:M (tablas puente mantienen nombre; FKs apuntan a tablas renombradas)
ALTER TABLE "mkt_publicaciones_ideas_detalle_redes" RENAME CONSTRAINT "mkt_publicaciones_ideas_detalle_redes_idea_detalle_id_fkey" TO "mkt_publi_ideas_detalle_redes_idea_detalle_id_fkey";
ALTER TABLE "mkt_publicaciones_ideas_detalle_redes" RENAME CONSTRAINT "mkt_publicaciones_ideas_detalle_redes_red_id_fkey" TO "mkt_publi_ideas_detalle_redes_red_id_fkey";
ALTER TABLE "mkt_publicaciones_ideas_detalle_tipos" RENAME CONSTRAINT "mkt_publicaciones_ideas_detalle_tipos_idea_detalle_id_fkey" TO "mkt_publi_ideas_detalle_tipos_idea_detalle_id_fkey";
ALTER TABLE "mkt_publicaciones_ideas_detalle_tipos" RENAME CONSTRAINT "mkt_publicaciones_ideas_detalle_tipos_tipo_publicacion_id_fkey" TO "mkt_publi_ideas_detalle_tipos_tipo_publicacion_id_fkey";
