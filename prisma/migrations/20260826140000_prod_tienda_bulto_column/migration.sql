-- Unidades por bulto pasan a prod_tienda.bulto (null = vacío).
-- Se copian los valores vigentes y se elimina la tabla 1:1 prod_tienda_bultos.

ALTER TABLE "prod_tienda"
  ADD COLUMN IF NOT EXISTS "bulto" INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'prod_tienda_bultos'
  ) THEN
    UPDATE "prod_tienda" AS t
    SET "bulto" = b."bulto"
    FROM "prod_tienda_bultos" AS b
    WHERE t."cod_tienda" = b."cod_tienda"
      AND b."bulto" > 0;
  END IF;
END $$;

ALTER TABLE "prod_tienda"
  DROP CONSTRAINT IF EXISTS "prod_tienda_bulto_positivo";

ALTER TABLE "prod_tienda"
  ADD CONSTRAINT "prod_tienda_bulto_positivo"
  CHECK ("bulto" IS NULL OR "bulto" > 0);

DROP TABLE IF EXISTS "prod_tienda_bultos";
