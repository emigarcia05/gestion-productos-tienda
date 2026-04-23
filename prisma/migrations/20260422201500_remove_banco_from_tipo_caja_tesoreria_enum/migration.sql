-- Quita el valor de enum `BANCO` de `TipoCajaTesoreria` (destino de acreditación = DIGITAL).
-- Filas con `BANCO` pasan a `DIGITAL`.

CREATE TYPE "TipoCajaTesoreria_new" AS ENUM ('DIGITAL', 'EFECTIVO', 'CHEQUE');

ALTER TABLE "fin_tesoreria" ALTER COLUMN "tipo_caja" DROP DEFAULT;

ALTER TABLE "fin_tesoreria"
  ALTER COLUMN "tipo_caja" TYPE "TipoCajaTesoreria_new"
  USING (
    CASE "tipo_caja"::text
      WHEN 'BANCO' THEN 'DIGITAL'::"TipoCajaTesoreria_new"
      WHEN 'DIGITAL' THEN 'DIGITAL'::"TipoCajaTesoreria_new"
      WHEN 'EFECTIVO' THEN 'EFECTIVO'::"TipoCajaTesoreria_new"
      WHEN 'CHEQUE' THEN 'CHEQUE'::"TipoCajaTesoreria_new"
      ELSE 'DIGITAL'::"TipoCajaTesoreria_new"
    END
  );

DROP TYPE "TipoCajaTesoreria";

ALTER TYPE "TipoCajaTesoreria_new" RENAME TO "TipoCajaTesoreria";
