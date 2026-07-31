-- Plantilla de fila para {{SUPERFICIES}} (Diseñar Colores)

ALTER TABLE "prod_ia_diseno_promp" ADD COLUMN "plantilla_superficies" TEXT;

UPDATE "prod_ia_diseno_promp"
SET "plantilla_superficies" = '- {{SUPERFICIE}} → {{COLOR}}'
WHERE "submodulo" ILIKE 'diseñar colores';
