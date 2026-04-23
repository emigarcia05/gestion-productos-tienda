-- Tipo de cheque de tesorería: físico vs e-cheque.

CREATE TYPE "TipoChequeTesoreria" AS ENUM ('FISICO', 'ECHEQUE');

ALTER TABLE "fin_tesoreria_cheques"
    ADD COLUMN "tipo" "TipoChequeTesoreria" NOT NULL DEFAULT 'FISICO';

ALTER TABLE "fin_tesoreria_cheques"
    ALTER COLUMN "tipo" DROP DEFAULT;
