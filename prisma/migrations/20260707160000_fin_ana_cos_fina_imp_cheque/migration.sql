-- Imp. cheque (boolean) en costos financieros Análisis M.C.

ALTER TABLE "fin_ana_cos_fina"
ADD COLUMN "imp_cheque" BOOLEAN NOT NULL DEFAULT false;
