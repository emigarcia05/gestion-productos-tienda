ALTER TABLE "proveedores"
ADD COLUMN IF NOT EXISTS "coeficiente_tintometrico" NUMERIC(12, 6);

UPDATE "proveedores"
SET "coeficiente_tintometrico" = 1
WHERE "coeficiente_tintometrico" IS NULL;

ALTER TABLE "proveedores"
ALTER COLUMN "coeficiente_tintometrico" SET DEFAULT 1,
ALTER COLUMN "coeficiente_tintometrico" SET NOT NULL;
