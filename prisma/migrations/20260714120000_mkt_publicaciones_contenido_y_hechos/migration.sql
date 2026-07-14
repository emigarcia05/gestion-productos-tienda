-- Tipos de contenido por tipo de publicación + hechos de publicación.
CREATE TABLE "mkt_publicaciones_contenido_tipo" (
    "id" TEXT NOT NULL,
    "contenido_nombre" TEXT NOT NULL,
    "tipo_publicacion_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mkt_publicaciones_contenido_tipo_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mkt_publicaciones_contenido_tipo_tipo_publicacion_id_fkey"
        FOREIGN KEY ("tipo_publicacion_id") REFERENCES "mkt_publicaciones_tipo"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "mkt_publicaciones_contenido_tipo_tipo_nombre_ux"
    ON "mkt_publicaciones_contenido_tipo"("tipo_publicacion_id", "contenido_nombre");

CREATE INDEX "mkt_publicaciones_contenido_tipo_tipo_idx"
    ON "mkt_publicaciones_contenido_tipo"("tipo_publicacion_id");

CREATE TABLE "mkt_publicaciones" (
    "id" TEXT NOT NULL,
    "red_id" TEXT NOT NULL,
    "tipo_publicacion_id" TEXT NOT NULL,
    "tipo_contenido_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mkt_publicaciones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mkt_publicaciones_red_id_fkey"
        FOREIGN KEY ("red_id") REFERENCES "mkt_publicaciones_redes"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "mkt_publicaciones_tipo_publicacion_id_fkey"
        FOREIGN KEY ("tipo_publicacion_id") REFERENCES "mkt_publicaciones_tipo"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "mkt_publicaciones_tipo_contenido_id_fkey"
        FOREIGN KEY ("tipo_contenido_id") REFERENCES "mkt_publicaciones_contenido_tipo"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "mkt_publicaciones_red_idx" ON "mkt_publicaciones"("red_id");
CREATE INDEX "mkt_publicaciones_tipo_idx" ON "mkt_publicaciones"("tipo_publicacion_id");
CREATE INDEX "mkt_publicaciones_contenido_idx" ON "mkt_publicaciones"("tipo_contenido_id");
