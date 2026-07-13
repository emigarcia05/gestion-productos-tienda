-- Catálogos base del área Marketing · Publicaciones.
CREATE TABLE "mkt_publicaciones_redes" (
    "id" TEXT NOT NULL,
    "red_social_nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mkt_publicaciones_redes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mkt_publicaciones_redes_red_social_nombre_key"
    ON "mkt_publicaciones_redes"("red_social_nombre");

CREATE TABLE "mkt_publicaciones_tipo" (
    "id" TEXT NOT NULL,
    "tipo_publicacion_nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mkt_publicaciones_tipo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mkt_publicaciones_tipo_tipo_publicacion_nombre_key"
    ON "mkt_publicaciones_tipo"("tipo_publicacion_nombre");
