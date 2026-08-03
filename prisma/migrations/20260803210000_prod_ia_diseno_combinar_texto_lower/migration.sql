-- Combinar: columna `texto` en minúsculas.
UPDATE "prod_ia_diseno_catalogo"
SET
  "texto" = lower("texto"),
  "updated_at" = CURRENT_TIMESTAMP
WHERE "kind" = 'combinar'
  AND "texto" IS DISTINCT FROM lower("texto");
