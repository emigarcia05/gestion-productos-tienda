-- Red y tipo de publicación: N:M por detalle de idea.

CREATE TABLE "mkt_publicaciones_ideas_detalle_redes" (
    "idea_detalle_id" TEXT NOT NULL,
    "red_id" TEXT NOT NULL,

    CONSTRAINT "mkt_publicaciones_ideas_detalle_redes_pkey"
        PRIMARY KEY ("idea_detalle_id", "red_id")
);

CREATE TABLE "mkt_publicaciones_ideas_detalle_tipos" (
    "idea_detalle_id" TEXT NOT NULL,
    "tipo_publicacion_id" TEXT NOT NULL,

    CONSTRAINT "mkt_publicaciones_ideas_detalle_tipos_pkey"
        PRIMARY KEY ("idea_detalle_id", "tipo_publicacion_id")
);

INSERT INTO "mkt_publicaciones_ideas_detalle_redes" ("idea_detalle_id", "red_id")
SELECT "id", "red_id"
FROM "mkt_publicaciones_ideas_detalle"
WHERE "red_id" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "mkt_publicaciones_ideas_detalle_tipos" ("idea_detalle_id", "tipo_publicacion_id")
SELECT "id", "tipo_publicacion_id"
FROM "mkt_publicaciones_ideas_detalle"
WHERE "tipo_publicacion_id" IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE "mkt_publicaciones_ideas_detalle"
    DROP CONSTRAINT IF EXISTS "mkt_publicaciones_ideas_detalle_red_id_fkey";

ALTER TABLE "mkt_publicaciones_ideas_detalle"
    DROP CONSTRAINT IF EXISTS "mkt_publicaciones_ideas_detalle_tipo_publicacion_id_fkey";

DROP INDEX IF EXISTS "mkt_publicaciones_ideas_detalle_red_idx";
DROP INDEX IF EXISTS "mkt_publicaciones_ideas_detalle_tipo_idx";

ALTER TABLE "mkt_publicaciones_ideas_detalle"
    DROP COLUMN IF EXISTS "red_id",
    DROP COLUMN IF EXISTS "tipo_publicacion_id";

ALTER TABLE "mkt_publicaciones_ideas_detalle_redes"
    ADD CONSTRAINT "mkt_publicaciones_ideas_detalle_redes_idea_detalle_id_fkey"
        FOREIGN KEY ("idea_detalle_id") REFERENCES "mkt_publicaciones_ideas_detalle"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mkt_publicaciones_ideas_detalle_redes"
    ADD CONSTRAINT "mkt_publicaciones_ideas_detalle_redes_red_id_fkey"
        FOREIGN KEY ("red_id") REFERENCES "mkt_publicaciones_redes"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mkt_publicaciones_ideas_detalle_tipos"
    ADD CONSTRAINT "mkt_publicaciones_ideas_detalle_tipos_idea_detalle_id_fkey"
        FOREIGN KEY ("idea_detalle_id") REFERENCES "mkt_publicaciones_ideas_detalle"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mkt_publicaciones_ideas_detalle_tipos"
    ADD CONSTRAINT "mkt_publicaciones_ideas_detalle_tipos_tipo_publicacion_id_fkey"
        FOREIGN KEY ("tipo_publicacion_id") REFERENCES "mkt_publicaciones_tipo"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "mkt_ideas_detalle_red_red_idx"
    ON "mkt_publicaciones_ideas_detalle_redes"("red_id");

CREATE INDEX "mkt_ideas_detalle_tipo_tipo_idx"
    ON "mkt_publicaciones_ideas_detalle_tipos"("tipo_publicacion_id");
