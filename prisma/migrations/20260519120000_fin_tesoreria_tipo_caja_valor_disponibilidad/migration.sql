-- Cajas tesorería: `tipo_caja` pasa a BANCO | BILLETERA_DIGITAL | CHEQUE | EFECTIVO.
-- Histórico `DIGITAL` → `BILLETERA_DIGITAL` (repartir manualmente a BANCO si aplica).
-- Nuevas columnas `tipo_valor` y `disponibilidad` (derivadas de `tipo_caja` en app; backfill aquí).

CREATE TYPE "TipoValorTesoreria" AS ENUM ('DIGITAL', 'EFECTIVO', 'CHEQUE');
CREATE TYPE "DisponibilidadCajaTesoreria" AS ENUM ('INMEDIATA', 'DIFERIDO');

ALTER TABLE "fin_tesoreria"
    ADD COLUMN "tipo_valor" "TipoValorTesoreria",
    ADD COLUMN "disponibilidad" "DisponibilidadCajaTesoreria";

CREATE TYPE "TipoCajaTesoreria_new" AS ENUM ('BANCO', 'BILLETERA_DIGITAL', 'CHEQUE', 'EFECTIVO');

ALTER TABLE "fin_tesoreria" ALTER COLUMN "tipo_caja" DROP DEFAULT;

ALTER TABLE "fin_tesoreria"
    ALTER COLUMN "tipo_caja" TYPE "TipoCajaTesoreria_new"
    USING (
        CASE "tipo_caja"::text
            WHEN 'DIGITAL' THEN 'BILLETERA_DIGITAL'::"TipoCajaTesoreria_new"
            WHEN 'EFECTIVO' THEN 'EFECTIVO'::"TipoCajaTesoreria_new"
            WHEN 'CHEQUE' THEN 'CHEQUE'::"TipoCajaTesoreria_new"
            ELSE 'BILLETERA_DIGITAL'::"TipoCajaTesoreria_new"
        END
    );

DROP TYPE "TipoCajaTesoreria";

ALTER TYPE "TipoCajaTesoreria_new" RENAME TO "TipoCajaTesoreria";

UPDATE "fin_tesoreria"
SET
    "tipo_valor" = CASE "tipo_caja"::text
        WHEN 'BANCO' THEN 'DIGITAL'::"TipoValorTesoreria"
        WHEN 'BILLETERA_DIGITAL' THEN 'DIGITAL'::"TipoValorTesoreria"
        WHEN 'EFECTIVO' THEN 'EFECTIVO'::"TipoValorTesoreria"
        WHEN 'CHEQUE' THEN 'CHEQUE'::"TipoValorTesoreria"
    END,
    "disponibilidad" = CASE "tipo_caja"::text
        WHEN 'CHEQUE' THEN 'DIFERIDO'::"DisponibilidadCajaTesoreria"
        ELSE 'INMEDIATA'::"DisponibilidadCajaTesoreria"
    END;

ALTER TABLE "fin_tesoreria" ALTER COLUMN "tipo_valor" SET NOT NULL;
ALTER TABLE "fin_tesoreria" ALTER COLUMN "disponibilidad" SET NOT NULL;

CREATE OR REPLACE FUNCTION fin_tesoreria_cheques_assert_caja_cheque()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM "fin_tesoreria" t
        WHERE t."id" = NEW."caja_id"
          AND t."tipo_caja" = 'CHEQUE'::"TipoCajaTesoreria"
    ) THEN
        RAISE EXCEPTION 'fin_tesoreria_cheques: la caja debe existir y tener tipo_caja CHEQUE';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
