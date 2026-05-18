-- IVA discriminado importado desde TXT (líneas alícuotas Libro IVA Digital).
ALTER TABLE "fin_bal_iva_deb_import"
ADD COLUMN "imp_iva" DECIMAL(14, 2) NOT NULL DEFAULT 0;
