-- Renombres Comp. Categorías (idempotente):
--   prod_comp_item | prod_comp_cat (ajustes por ítem) → prod_comp_item_comparados
--   prod_comp_present_refs_comp                      → prod_comp_item_referencia

-- ── Ítems comparados (DTO. EXTRA, DIF % REF. MAN.) ───────────────────────────
DO $$
BEGIN
  IF to_regclass('public.prod_comp_item_comparados') IS NOT NULL THEN
    NULL;
  ELSIF to_regclass('public.prod_comp_item') IS NOT NULL THEN
    ALTER TABLE "prod_comp_item" RENAME TO "prod_comp_item_comparados";
  ELSIF to_regclass('public.prod_comp_cat') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'prod_comp_cat'
        AND column_name = 'cod_ext_prod_precios_provee'
    ) THEN
    ALTER TABLE "prod_comp_cat" RENAME TO "prod_comp_item_comparados";
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.prod_comp_item_comparados') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prod_comp_item_pkey') THEN
    ALTER TABLE "prod_comp_item_comparados"
      RENAME CONSTRAINT "prod_comp_item_pkey" TO "prod_comp_item_comparados_pkey";
  ELSIF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prod_comp_cat_pkey') THEN
    ALTER TABLE "prod_comp_item_comparados"
      RENAME CONSTRAINT "prod_comp_cat_pkey" TO "prod_comp_item_comparados_pkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prod_comp_item_cod_ext_prod_precios_provee_key'
  ) THEN
    ALTER TABLE "prod_comp_item_comparados"
      RENAME CONSTRAINT "prod_comp_item_cod_ext_prod_precios_provee_key"
      TO "prod_comp_item_comparados_cod_ext_prod_precios_provee_key";
  ELSIF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prod_comp_cat_cod_ext_prod_precios_provee_key'
  ) THEN
    ALTER TABLE "prod_comp_item_comparados"
      RENAME CONSTRAINT "prod_comp_cat_cod_ext_prod_precios_provee_key"
      TO "prod_comp_item_comparados_cod_ext_prod_precios_provee_key";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prod_comp_item_cod_ext_prod_precios_provee_fkey'
  ) THEN
    ALTER TABLE "prod_comp_item_comparados"
      RENAME CONSTRAINT "prod_comp_item_cod_ext_prod_precios_provee_fkey"
      TO "prod_comp_item_comparados_cod_ext_prod_precios_provee_fkey";
  ELSIF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prod_comp_cat_cod_ext_prod_precios_provee_fkey'
  ) THEN
    ALTER TABLE "prod_comp_item_comparados"
      RENAME CONSTRAINT "prod_comp_cat_cod_ext_prod_precios_provee_fkey"
      TO "prod_comp_item_comparados_cod_ext_prod_precios_provee_fkey";
  END IF;
END $$;

-- ── Referencias Px Competencia por presentación ──────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.prod_comp_item_referencia') IS NOT NULL THEN
    NULL;
  ELSIF to_regclass('public.prod_comp_present_refs_comp') IS NOT NULL THEN
    ALTER TABLE "prod_comp_present_refs_comp" RENAME TO "prod_comp_item_referencia";
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.prod_comp_item_referencia') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prod_comp_present_refs_comp_pkey'
  ) THEN
    ALTER TABLE "prod_comp_item_referencia"
      RENAME CONSTRAINT "prod_comp_present_refs_comp_pkey"
      TO "prod_comp_item_referencia_pkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'prod_comp_present_refs_comp_present_ref_ux'
  ) THEN
    ALTER INDEX "prod_comp_present_refs_comp_present_ref_ux"
      RENAME TO "prod_comp_item_referencia_present_ref_ux";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'prod_comp_present_refs_comp_presentacion_id_idx'
  ) THEN
    ALTER INDEX "prod_comp_present_refs_comp_presentacion_id_idx"
      RENAME TO "prod_comp_item_referencia_presentacion_id_idx";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prod_comp_present_refs_comp_presentacion_id_fkey'
  ) THEN
    ALTER TABLE "prod_comp_item_referencia"
      RENAME CONSTRAINT "prod_comp_present_refs_comp_presentacion_id_fkey"
      TO "prod_comp_item_referencia_presentacion_id_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prod_comp_present_refs_comp_ref_competencia_fkey'
  ) THEN
    ALTER TABLE "prod_comp_item_referencia"
      RENAME CONSTRAINT "prod_comp_present_refs_comp_ref_competencia_fkey"
      TO "prod_comp_item_referencia_ref_competencia_fkey";
  END IF;
END $$;
