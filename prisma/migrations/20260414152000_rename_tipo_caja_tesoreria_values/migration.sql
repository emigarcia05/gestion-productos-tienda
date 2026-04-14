-- Ajuste de valores de enum para tipo de caja:
-- BANCO -> DIGITAL
-- OTRA  -> CHEQUE

ALTER TYPE "TipoCajaTesoreria" RENAME VALUE 'BANCO' TO 'DIGITAL';
ALTER TYPE "TipoCajaTesoreria" RENAME VALUE 'OTRA' TO 'CHEQUE';
