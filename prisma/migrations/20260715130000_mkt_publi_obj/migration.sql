-- Objetivos recurrentes de publicaciones (Marketing).

CREATE TYPE "MktPubliObjPeriodo" AS ENUM ('SEMANAL', 'MENSUAL');
CREATE TYPE "MktPubliObjEje" AS ENUM ('RED', 'CONTENIDO', 'SECCION');

CREATE TABLE "mkt_publi_obj" (
    "id" TEXT NOT NULL,
    "periodo" "MktPubliObjPeriodo" NOT NULL,
    "eje" "MktPubliObjEje" NOT NULL,
    "destino_clave" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "red_id" TEXT,
    "tipo_contenido_id" TEXT,
    "seccion_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mkt_publi_obj_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mkt_publi_obj_destino_clave_key" ON "mkt_publi_obj"("destino_clave");
CREATE INDEX "mkt_publi_obj_periodo_idx" ON "mkt_publi_obj"("periodo");
CREATE INDEX "mkt_publi_obj_eje_idx" ON "mkt_publi_obj"("eje");

ALTER TABLE "mkt_publi_obj"
ADD CONSTRAINT "mkt_publi_obj_red_id_fkey"
FOREIGN KEY ("red_id") REFERENCES "mkt_publi_tipo_redes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mkt_publi_obj"
ADD CONSTRAINT "mkt_publi_obj_tipo_contenido_id_fkey"
FOREIGN KEY ("tipo_contenido_id") REFERENCES "mkt_publi_tipo_contenido"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mkt_publi_obj"
ADD CONSTRAINT "mkt_publi_obj_seccion_id_fkey"
FOREIGN KEY ("seccion_id") REFERENCES "mkt_publi_ideas_secciones"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
