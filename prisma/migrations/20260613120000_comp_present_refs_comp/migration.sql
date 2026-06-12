-- Múltiples referencias Px Competencia por presentación (prod_comp_present_refs_comp).
-- Migra FK legacy en prod_comp_presentaciones y elimina ref_cod_tienda / ref_competencia_id.

CREATE TABLE IF NOT EXISTS "prod_comp_present_refs_comp" (
    "id" TEXT NOT NULL,
    "presentacion_id" TEXT NOT NULL,
    "ref_cod_tienda" TEXT NOT NULL,
    "ref_competencia_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prod_comp_present_refs_comp_pkey" PRIMARY KEY ("id")
);

INSERT INTO "prod_comp_present_refs_comp" (
    "id",
    "presentacion_id",
    "ref_cod_tienda",
    "ref_competencia_id",
    "orden",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid()::text,
    p."id",
    p."ref_cod_tienda",
    p."ref_competencia_id",
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "prod_comp_presentaciones" AS p
WHERE p."ref_cod_tienda" IS NOT NULL
  AND p."ref_competencia_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "prod_comp_present_refs_comp" AS r
    WHERE r."presentacion_id" = p."id"
      AND r."ref_cod_tienda" = p."ref_cod_tienda"
      AND r."ref_competencia_id" = p."ref_competencia_id"
  );

ALTER TABLE "prod_comp_presentaciones"
  DROP CONSTRAINT IF EXISTS "prod_comp_presentaciones_ref_competencia_fkey";

DROP INDEX IF EXISTS "prod_comp_presentaciones_ref_competencia_key";

ALTER TABLE "prod_comp_presentaciones"
  DROP COLUMN IF EXISTS "ref_cod_tienda",
  DROP COLUMN IF EXISTS "ref_competencia_id";

CREATE UNIQUE INDEX IF NOT EXISTS "prod_comp_present_refs_comp_present_ref_ux"
  ON "prod_comp_present_refs_comp" ("presentacion_id", "ref_cod_tienda", "ref_competencia_id");

CREATE INDEX IF NOT EXISTS "prod_comp_present_refs_comp_presentacion_id_idx"
  ON "prod_comp_present_refs_comp" ("presentacion_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prod_comp_present_refs_comp_presentacion_id_fkey'
  ) THEN
    ALTER TABLE "prod_comp_present_refs_comp"
      ADD CONSTRAINT "prod_comp_present_refs_comp_presentacion_id_fkey"
      FOREIGN KEY ("presentacion_id")
      REFERENCES "prod_comp_presentaciones" ("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prod_comp_present_refs_comp_ref_competencia_fkey'
  ) THEN
    ALTER TABLE "prod_comp_present_refs_comp"
      ADD CONSTRAINT "prod_comp_present_refs_comp_ref_competencia_fkey"
      FOREIGN KEY ("ref_cod_tienda", "ref_competencia_id")
      REFERENCES "prod_precios_competencia" ("cod_tienda", "competencia_id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
