-- TENEDOR: mismo conjunto cerrado que titulares de `fin_tesoreria`.
-- Idempotente si una ejecución anterior dejó la columna sin CHECK (fallo previo).

ALTER TABLE "fin_tesoreria_cheques" ADD COLUMN IF NOT EXISTS "tenedor" TEXT;

UPDATE "fin_tesoreria_cheques" AS c
SET "tenedor" = t."titular"
FROM "fin_tesoreria" AS t
WHERE c."caja_id" = t."id";

UPDATE "fin_tesoreria_cheques"
SET "tenedor" = 'EMILIANO GARCIA'
WHERE "tenedor" IS NULL;

UPDATE "fin_tesoreria_cheques"
SET "tenedor" = CASE TRIM(UPPER("tenedor"))
    WHEN 'SUC. GUAYMALLEN' THEN 'SUC. GUAYMALLEN'
    WHEN 'SUC. MAIPU' THEN 'SUC. MAIPU'
    WHEN 'WALTER GARCIA' THEN 'WALTER GARCIA'
    WHEN 'FERNANDO PANAIA' THEN 'FERNANDO PANAIA'
    WHEN 'EMILIANO GARCIA' THEN 'EMILIANO GARCIA'
    WHEN 'VANESA GARCIA' THEN 'VANESA GARCIA'
    ELSE 'EMILIANO GARCIA'
END;

UPDATE "fin_tesoreria_cheques"
SET "tenedor" = 'EMILIANO GARCIA'
WHERE "tenedor" NOT IN (
                          'SUC. GUAYMALLEN',
                          'SUC. MAIPU',
                          'WALTER GARCIA',
                          'FERNANDO PANAIA',
                          'EMILIANO GARCIA',
                          'VANESA GARCIA'
    );

ALTER TABLE "fin_tesoreria_cheques"
    ALTER COLUMN "tenedor" SET NOT NULL;

ALTER TABLE "fin_tesoreria_cheques"
    DROP CONSTRAINT IF EXISTS "fin_tesoreria_cheques_tenedor_check";

ALTER TABLE "fin_tesoreria_cheques"
    ADD CONSTRAINT "fin_tesoreria_cheques_tenedor_check"
        CHECK ("tenedor" IN (
                               'SUC. GUAYMALLEN',
                               'SUC. MAIPU',
                               'WALTER GARCIA',
                               'FERNANDO PANAIA',
                               'EMILIANO GARCIA',
                               'VANESA GARCIA'
            ));
