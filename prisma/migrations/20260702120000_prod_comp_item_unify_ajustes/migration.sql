-- Unifica prod_comp_dto_extra + prod_comp_dif_px_ref_manual en prod_comp_cat (ajustes por ítem).
-- El catálogo maestro CategoriaComparacion pasa de prod_comp_cat → prod_comp_categorias.
-- Idempotente: tolera entornos donde el catálogo aún se llama prod_comp_cat, comparacion_categorias
-- o categorias_comparacion, o donde prod_comp_categorias ya existe.

DO $$
BEGIN
  IF to_regclass('public.prod_comp_categorias') IS NOT NULL THEN
    NULL;
  ELSIF to_regclass('public.prod_comp_cat') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'prod_comp_cat'
        AND column_name = 'nombre'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'prod_comp_cat'
        AND column_name = 'cod_ext_prod_precios_provee'
    ) THEN
    ALTER TABLE "prod_comp_cat" RENAME TO "prod_comp_categorias";
    ALTER INDEX IF EXISTS "prod_comp_cat_pkey" RENAME TO "prod_comp_categorias_pkey";
  ELSIF to_regclass('public.comparacion_categorias') IS NOT NULL THEN
    ALTER TABLE "comparacion_categorias" RENAME TO "prod_comp_categorias";
    ALTER INDEX IF EXISTS "categorias_comparacion_pkey" RENAME TO "prod_comp_categorias_pkey";
  ELSIF to_regclass('public.categorias_comparacion') IS NOT NULL THEN
    ALTER TABLE "categorias_comparacion" RENAME TO "prod_comp_categorias";
    ALTER INDEX IF EXISTS "categorias_comparacion_pkey" RENAME TO "prod_comp_categorias_pkey";
  ELSE
    CREATE TABLE IF NOT EXISTS "prod_comp_categorias" (
      "id" TEXT NOT NULL,
      "nombre" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "prod_comp_categorias_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "prod_comp_cat" (
  "id" TEXT NOT NULL,
  "cod_ext_prod_precios_provee" TEXT NOT NULL,
  "dto_extra" INTEGER,
  "dif_px_ref_manual" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "prod_comp_cat_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prod_comp_cat_cod_ext_prod_precios_provee_key" UNIQUE ("cod_ext_prod_precios_provee"),
  CONSTRAINT "prod_comp_cat_cod_ext_prod_precios_provee_fkey"
    FOREIGN KEY ("cod_ext_prod_precios_provee")
    REFERENCES "prod_precios_provee"("cod_ext")
    ON DELETE CASCADE ON UPDATE CASCADE
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "prod_comp_cat" LIMIT 1) THEN
    RETURN;
  END IF;

  IF to_regclass('public.prod_comp_dto_extra') IS NOT NULL
     AND to_regclass('public.prod_comp_dif_px_ref_manual') IS NOT NULL THEN
    INSERT INTO "prod_comp_cat" (
      "id",
      "cod_ext_prod_precios_provee",
      "dto_extra",
      "dif_px_ref_manual",
      "created_at",
      "updated_at"
    )
    SELECT
      COALESCE(d."id", m."id"),
      COALESCE(d."cod_ext_prod_precios_provee", m."cod_ext_prod_precios_provee"),
      d."dto_extra",
      m."dif_px_ref_manual",
      LEAST(COALESCE(d."created_at", m."created_at"), COALESCE(m."created_at", d."created_at")),
      GREATEST(COALESCE(d."updated_at", m."updated_at"), COALESCE(m."updated_at", d."updated_at"))
    FROM "prod_comp_dto_extra" d
    FULL OUTER JOIN "prod_comp_dif_px_ref_manual" m
      ON d."cod_ext_prod_precios_provee" = m."cod_ext_prod_precios_provee";
  ELSIF to_regclass('public.prod_comp_dto_extra') IS NOT NULL THEN
    INSERT INTO "prod_comp_cat" (
      "id",
      "cod_ext_prod_precios_provee",
      "dto_extra",
      "dif_px_ref_manual",
      "created_at",
      "updated_at"
    )
    SELECT
      d."id",
      d."cod_ext_prod_precios_provee",
      d."dto_extra",
      NULL,
      d."created_at",
      d."updated_at"
    FROM "prod_comp_dto_extra" d;
  ELSIF to_regclass('public.prod_comp_dif_px_ref_manual') IS NOT NULL THEN
    INSERT INTO "prod_comp_cat" (
      "id",
      "cod_ext_prod_precios_provee",
      "dto_extra",
      "dif_px_ref_manual",
      "created_at",
      "updated_at"
    )
    SELECT
      m."id",
      m."cod_ext_prod_precios_provee",
      NULL,
      m."dif_px_ref_manual",
      m."created_at",
      m."updated_at"
    FROM "prod_comp_dif_px_ref_manual" m;
  END IF;
END $$;

DROP TABLE IF EXISTS "prod_comp_dto_extra";
DROP TABLE IF EXISTS "prod_comp_dif_px_ref_manual";
