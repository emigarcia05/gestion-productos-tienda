-- Gasto eventual (`gasto_mensual = false`): sin sucursal en BD (FK opcional).
ALTER TABLE "fin_bal_gasto_final" ALTER COLUMN "sucursal_id" DROP NOT NULL;
