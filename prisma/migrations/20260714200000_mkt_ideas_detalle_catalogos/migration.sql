-- Detalles de idea: FKs a red / tipo publicación / tipo contenido.
-- Si hay filas previas sin catálogos, no se puede agregar NOT NULL; el módulo es nuevo.

DELETE FROM "mkt_publicaciones_ideas_detalle";

ALTER TABLE "mkt_publicaciones_ideas_detalle"
    ADD COLUMN "red_id" TEXT NOT NULL,
    ADD COLUMN "tipo_publicacion_id" TEXT NOT NULL,
    ADD COLUMN "tipo_contenido_id" TEXT NOT NULL;

ALTER TABLE "mkt_publicaciones_ideas_detalle"
    ADD CONSTRAINT "mkt_publicaciones_ideas_detalle_red_id_fkey"
        FOREIGN KEY ("red_id") REFERENCES "mkt_publicaciones_redes"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mkt_publicaciones_ideas_detalle"
    ADD CONSTRAINT "mkt_publicaciones_ideas_detalle_tipo_publicacion_id_fkey"
        FOREIGN KEY ("tipo_publicacion_id") REFERENCES "mkt_publicaciones_tipo"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mkt_publicaciones_ideas_detalle"
    ADD CONSTRAINT "mkt_publicaciones_ideas_detalle_tipo_contenido_id_fkey"
        FOREIGN KEY ("tipo_contenido_id") REFERENCES "mkt_publicaciones_contenido_tipo"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "mkt_publicaciones_ideas_detalle_red_idx"
    ON "mkt_publicaciones_ideas_detalle"("red_id");

CREATE INDEX "mkt_publicaciones_ideas_detalle_tipo_idx"
    ON "mkt_publicaciones_ideas_detalle"("tipo_publicacion_id");

CREATE INDEX "mkt_publicaciones_ideas_detalle_contenido_idx"
    ON "mkt_publicaciones_ideas_detalle"("tipo_contenido_id");
