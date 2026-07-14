-- Ideas de publicación: secciones + detalles.

CREATE TABLE "mkt_publicaciones_ideas_secciones" (
    "id" TEXT NOT NULL,
    "idea_nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mkt_publicaciones_ideas_secciones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mkt_publicaciones_ideas_secciones_idea_nombre_key"
    ON "mkt_publicaciones_ideas_secciones"("idea_nombre");

CREATE TABLE "mkt_publicaciones_ideas_detalle" (
    "id" TEXT NOT NULL,
    "seccion_id" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "usada" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mkt_publicaciones_ideas_detalle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mkt_publicaciones_ideas_detalle_seccion_idx"
    ON "mkt_publicaciones_ideas_detalle"("seccion_id");

CREATE INDEX "mkt_publicaciones_ideas_detalle_usada_idx"
    ON "mkt_publicaciones_ideas_detalle"("usada");

ALTER TABLE "mkt_publicaciones_ideas_detalle"
    ADD CONSTRAINT "mkt_publicaciones_ideas_detalle_seccion_id_fkey"
        FOREIGN KEY ("seccion_id") REFERENCES "mkt_publicaciones_ideas_secciones"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
