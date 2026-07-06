-- Membresía Comp. Categorías centralizada en prod_comp_item_comparados.
-- Deja de usarse prod_precios_provee.id_presentacion.

-- 1) Columna presentacion_id
ALTER TABLE "prod_comp_item_comparados"
  ADD COLUMN IF NOT EXISTS "presentacion_id" TEXT;

-- 2) Repoblar desde id_presentacion (se pierden filas previas sin presentación)
DELETE FROM "prod_comp_item_comparados";

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
    SELECT 1
    FROM "prod_comp_presentaciones" AS p
    WHERE p."id" = lp."id_presentacion"
  );

-- 3) Quitar unique legacy solo por cod_ext
ALTER TABLE "prod_comp_item_comparados"
  DROP CONSTRAINT IF EXISTS "prod_comp_item_comparados_cod_ext_prod_precios_provee_key";

ALTER TABLE "prod_comp_item_comparados"
  DROP CONSTRAINT IF EXISTS "prod_comp_cat_cod_ext_prod_precios_provee_key";

ALTER TABLE "prod_comp_item_comparados"
  DROP CONSTRAINT IF EXISTS "prod_comp_item_cod_ext_prod_precios_provee_key";

DROP INDEX IF EXISTS "prod_comp_item_comparados_cod_ext_prod_precios_provee_key";
DROP INDEX IF EXISTS "prod_comp_cat_cod_ext_prod_precios_provee_key";
DROP INDEX IF EXISTS "prod_comp_item_cod_ext_prod_precios_provee_key";

-- 4) presentacion_id obligatorio en filas de membresía
DELETE FROM "prod_comp_item_comparados" WHERE "presentacion_id" IS NULL;

ALTER TABLE "prod_comp_item_comparados"
  ALTER COLUMN "presentacion_id" SET NOT NULL;

-- 5) Índices y FK presentación
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

-- 6) Eliminar id_presentacion de prod_precios_provee
ALTER TABLE "prod_precios_provee"
  DROP CONSTRAINT IF EXISTS "prod_precios_provee_id_presentacion_fkey";

ALTER TABLE "prod_precios_provee"
  DROP CONSTRAINT IF EXISTS "lista_precios_proveedores_id_presentacion_fkey";

ALTER TABLE "prod_precios_provee"
  DROP COLUMN IF EXISTS "id_presentacion";
