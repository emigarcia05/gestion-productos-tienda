-- N:M publicaciones ↔ redes (`mkt_publi_redes`).

CREATE TABLE "mkt_publi_redes" (
    "publicacion_id" TEXT NOT NULL,
    "red_id" TEXT NOT NULL,

    CONSTRAINT "mkt_publi_redes_pkey" PRIMARY KEY ("publicacion_id", "red_id"),
    CONSTRAINT "mkt_publi_redes_publicacion_id_fkey"
        FOREIGN KEY ("publicacion_id") REFERENCES "mkt_publi"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mkt_publi_redes_red_id_fkey"
        FOREIGN KEY ("red_id") REFERENCES "mkt_publi_tipo_redes"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "mkt_publi_redes_red_idx" ON "mkt_publi_redes"("red_id");

-- Migrar FK actual a la puente.
INSERT INTO "mkt_publi_redes" ("publicacion_id", "red_id")
SELECT "id", "red_id" FROM "mkt_publi";

ALTER TABLE "mkt_publi" DROP CONSTRAINT IF EXISTS "mkt_publi_red_id_fkey";
ALTER TABLE "mkt_publi" DROP CONSTRAINT IF EXISTS "mkt_publicaciones_red_id_fkey";
DROP INDEX IF EXISTS "mkt_publi_red_idx";
DROP INDEX IF EXISTS "mkt_publicaciones_red_idx";
ALTER TABLE "mkt_publi" DROP COLUMN "red_id";
