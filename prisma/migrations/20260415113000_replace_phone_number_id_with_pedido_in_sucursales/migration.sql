ALTER TABLE "sucursales"
DROP COLUMN IF EXISTS "phone_number_id";

ALTER TABLE "sucursales"
ADD COLUMN IF NOT EXISTS "pedido" BOOLEAN;

UPDATE "sucursales"
SET "pedido" = TRUE
WHERE "pedido" IS NULL;

ALTER TABLE "sucursales"
ALTER COLUMN "pedido" SET NOT NULL,
ALTER COLUMN "pedido" SET DEFAULT TRUE;
