-- Idempotente: el índice único puede existir solo como INDEX o como CONSTRAINT según el historial de migraciones.
DROP INDEX IF EXISTS "fin_bal_gasto_final_gasto_proveedor_sucursal_ux";
ALTER TABLE "fin_bal_gasto_final" DROP CONSTRAINT IF EXISTS "fin_bal_gasto_final_gasto_proveedor_sucursal_ux";
