-- Alinear CHECK `tenedor` con `TITULARES_CAJA_TESORERIA` (`src/lib/cajasTesoreriaTitulares.ts`).
-- La migración `20260422160000_add_tenedor_fin_tesoreria_cheques` listó seis valores; falta **COORPORATIVO**.

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
                               'VANESA GARCIA',
                               'COORPORATIVO'
            ));
