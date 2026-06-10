-- Px Competencia: productos incluidos explícitamente en comparación (no lo pisa sync DUX).
ALTER TABLE "prod_tienda"
ADD COLUMN "comparar_competencia" BOOLEAN NOT NULL DEFAULT false;

-- Conservar productos que ya tenían vínculos de competencia configurados.
UPDATE "prod_tienda" pt
SET "comparar_competencia" = true
WHERE EXISTS (
  SELECT 1
  FROM "prod_precios_competencia" ppc
  WHERE ppc."cod_tienda" = pt."cod_tienda"
);

CREATE INDEX "prod_tienda_comparar_competencia_idx"
ON "prod_tienda" ("comparar_competencia")
WHERE "comparar_competencia" = true;
