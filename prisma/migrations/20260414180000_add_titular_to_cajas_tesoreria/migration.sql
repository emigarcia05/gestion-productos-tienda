ALTER TABLE "cajas_tesoreria"
ADD COLUMN "titular" TEXT;

UPDATE "cajas_tesoreria"
SET "titular" = 'SIN TITULAR'
WHERE "titular" IS NULL;

ALTER TABLE "cajas_tesoreria"
ALTER COLUMN "titular" SET NOT NULL;
