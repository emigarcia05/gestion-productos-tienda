-- Recuperación idempotente si prod_comp_categorias falta pero 20260702120000 ya figura aplicada
-- (p. ej. migrate resolve --applied sin ejecutar SQL). No modifica prod_comp_cat (ajustes por ítem).

DO $$
BEGIN
  IF to_regclass('public.prod_comp_categorias') IS NOT NULL THEN
    RETURN;
  END IF;

  IF to_regclass('public.prod_comp_cat') IS NOT NULL
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
    RETURN;
  END IF;

  IF to_regclass('public.comparacion_categorias') IS NOT NULL THEN
    ALTER TABLE "comparacion_categorias" RENAME TO "prod_comp_categorias";
    ALTER INDEX IF EXISTS "categorias_comparacion_pkey" RENAME TO "prod_comp_categorias_pkey";
    RETURN;
  END IF;

  IF to_regclass('public.categorias_comparacion') IS NOT NULL THEN
    ALTER TABLE "categorias_comparacion" RENAME TO "prod_comp_categorias";
    ALTER INDEX IF EXISTS "categorias_comparacion_pkey" RENAME TO "prod_comp_categorias_pkey";
    RETURN;
  END IF;

  CREATE TABLE "prod_comp_categorias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "prod_comp_categorias_pkey" PRIMARY KEY ("id")
  );
END $$;
