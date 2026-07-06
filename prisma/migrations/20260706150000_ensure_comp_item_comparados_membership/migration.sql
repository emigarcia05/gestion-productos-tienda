-- Recuperación idempotente: membresía en prod_comp_item_comparados + rename refs si falta.
-- Cubre prod donde el código nuevo está desplegado pero 20260706140000 no corrió o quedó a medias.

-- ── A) prod_comp_item_comparados.presentacion_id ─────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prod_comp_item_comparados'
      AND column_name = 'presentacion_id'
  ) THEN
    ALTER TABLE "prod_comp_item_comparados" ADD COLUMN "presentacion_id" TEXT;
  END IF;
END $$;

-- Backfill desde prod_precios_provee.id_presentacion (si la columna legacy aún existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prod_precios_provee'
      AND column_name = 'id_presentacion'
  ) THEN
    INSERT INTO "prod_comp_item_comparados" (
      "id",
      "presentacion_id",
      "cod_ext_prod_precios_provee",
      "dto_extra",
      "dif_px_ref_manual",
      "created_at",
      "updated_at"
    )
    SELECT
      gen_random_uuid()::text,
      lp."id_presentacion",
      lp."cod_ext",
      NULL,
      NULL,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM "prod_precios_provee" AS lp
    WHERE lp."id_presentacion" IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM "prod_comp_presentaciones" AS p WHERE p."id" = lp."id_presentacion"
      )
      AND NOT EXISTS (
        SELECT 1 FROM "prod_comp_item_comparados" AS ic
        WHERE ic."presentacion_id" = lp."id_presentacion"
          AND ic."cod_ext_prod_precios_provee" = lp."cod_ext"
      );

    UPDATE "prod_comp_item_comparados" AS ic
    SET "presentacion_id" = lp."id_presentacion"
    FROM "prod_precios_provee" AS lp
    WHERE ic."presentacion_id" IS NULL
      AND ic."cod_ext_prod_precios_provee" = lp."cod_ext"
      AND lp."id_presentacion" IS NOT NULL;
  END IF;
END $$;

-- Filas huérfanas sin presentación (ajustes viejos sin membresía)
DELETE FROM "prod_comp_item_comparados" WHERE "presentacion_id" IS NULL;

-- Quitar unique legacy solo por cod_ext
ALTER TABLE "prod_comp_item_comparados"
  DROP CONSTRAINT IF EXISTS "prod_comp_item_comparados_cod_ext_prod_precios_provee_key";
ALTER TABLE "prod_comp_item_comparados"
  DROP CONSTRAINT IF EXISTS "prod_comp_cat_cod_ext_prod_precios_provee_key";
ALTER TABLE "prod_comp_item_comparados"
  DROP CONSTRAINT IF EXISTS "prod_comp_item_cod_ext_prod_precios_provee_key";
DROP INDEX IF EXISTS "prod_comp_item_comparados_cod_ext_prod_precios_provee_key";
DROP INDEX IF EXISTS "prod_comp_cat_cod_ext_prod_precios_provee_key";
DROP INDEX IF EXISTS "prod_comp_item_cod_ext_prod_precios_provee_key";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prod_comp_item_comparados'
      AND column_name = 'presentacion_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "prod_comp_item_comparados"
      ALTER COLUMN "presentacion_id" SET NOT NULL;
  END IF;
EXCEPTION
  WHEN others THEN
    NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "prod_comp_item_comparados_present_cod_ext_ux"
  ON "prod_comp_item_comparados" ("presentacion_id", "cod_ext_prod_precios_provee");

CREATE INDEX IF NOT EXISTS "prod_comp_item_comparados_presentacion_id_idx"
  ON "prod_comp_item_comparados" ("presentacion_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prod_comp_item_comparados_presentacion_id_fkey'
  ) THEN
    ALTER TABLE "prod_comp_item_comparados"
      ADD CONSTRAINT "prod_comp_item_comparados_presentacion_id_fkey"
      FOREIGN KEY ("presentacion_id")
      REFERENCES "prod_comp_presentaciones" ("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "prod_precios_provee"
  DROP CONSTRAINT IF EXISTS "prod_precios_provee_id_presentacion_fkey";
ALTER TABLE "prod_precios_provee"
  DROP CONSTRAINT IF EXISTS "lista_precios_proveedores_id_presentacion_fkey";
ALTER TABLE "prod_precios_provee"
  DROP COLUMN IF EXISTS "id_presentacion";

-- ── B) prod_comp_present_refs_comp → prod_comp_item_referencia (si falta rename) ─
DO $$
BEGIN
  IF to_regclass('public.prod_comp_item_referencia') IS NULL
     AND to_regclass('public.prod_comp_present_refs_comp') IS NOT NULL THEN
    ALTER TABLE "prod_comp_present_refs_comp" RENAME TO "prod_comp_item_referencia";
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.prod_comp_item_referencia') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prod_comp_present_refs_comp_pkey') THEN
    ALTER TABLE "prod_comp_item_referencia"
      RENAME CONSTRAINT "prod_comp_present_refs_comp_pkey"
      TO "prod_comp_item_referencia_pkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'prod_comp_present_refs_comp_present_ref_ux') THEN
    ALTER INDEX "prod_comp_present_refs_comp_present_ref_ux"
      RENAME TO "prod_comp_item_referencia_present_ref_ux";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'prod_comp_present_refs_comp_presentacion_id_idx') THEN
    ALTER INDEX "prod_comp_present_refs_comp_presentacion_id_idx"
      RENAME TO "prod_comp_item_referencia_presentacion_id_idx";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prod_comp_present_refs_comp_presentacion_id_fkey'
  ) THEN
    ALTER TABLE "prod_comp_item_referencia"
      RENAME CONSTRAINT "prod_comp_present_refs_comp_presentacion_id_fkey"
      TO "prod_comp_item_referencia_presentacion_id_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prod_comp_present_refs_comp_ref_competencia_fkey'
  ) THEN
    ALTER TABLE "prod_comp_item_referencia"
      RENAME CONSTRAINT "prod_comp_present_refs_comp_ref_competencia_fkey"
      TO "prod_comp_item_referencia_ref_competencia_fkey";
  END IF;
END $$;
