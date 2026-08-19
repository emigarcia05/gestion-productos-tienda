-- envios_direcciones: direccion → calle_nombre; distrito; departamento (Mendoza).
-- Textos libres: primera letra mayúscula, resto minúsculas.

CREATE TYPE "EnviosDepartamento" AS ENUM ('LAS_HERAS', 'GODOY_CRUZ', 'GUAYMALLEN', 'MAIPU', 'LUJAN');

ALTER TABLE "envios_direcciones" RENAME COLUMN "direccion" TO "calle_nombre";
ALTER INDEX "envios_direcciones_direccion_idx" RENAME TO "envios_direcciones_calle_nombre_idx";

ALTER TABLE "envios_direcciones" ADD COLUMN "distrito" TEXT NOT NULL DEFAULT '';
ALTER TABLE "envios_direcciones" ADD COLUMN "departamento" "EnviosDepartamento" NOT NULL DEFAULT 'LAS_HERAS';

ALTER TABLE "envios_direcciones" ALTER COLUMN "distrito" DROP DEFAULT;
ALTER TABLE "envios_direcciones" ALTER COLUMN "departamento" DROP DEFAULT;

CREATE INDEX "envios_direcciones_departamento_idx" ON "envios_direcciones"("departamento");

UPDATE "envios_direcciones"
SET
  "calle_nombre" = CASE
    WHEN btrim("calle_nombre") = '' THEN btrim("calle_nombre")
    ELSE upper(left(lower(regexp_replace(btrim("calle_nombre"), '\s+', ' ', 'g')), 1))
      || substr(lower(regexp_replace(btrim("calle_nombre"), '\s+', ' ', 'g')), 2)
  END,
  "numeracion" = CASE
    WHEN btrim("numeracion") = '' THEN btrim("numeracion")
    ELSE upper(left(lower(regexp_replace(btrim("numeracion"), '\s+', ' ', 'g')), 1))
      || substr(lower(regexp_replace(btrim("numeracion"), '\s+', ' ', 'g')), 2)
  END,
  "referencia" = CASE
    WHEN "referencia" IS NULL OR btrim("referencia") = '' THEN NULL
    ELSE upper(left(lower(regexp_replace(btrim("referencia"), '\s+', ' ', 'g')), 1))
      || substr(lower(regexp_replace(btrim("referencia"), '\s+', ' ', 'g')), 2)
  END;
