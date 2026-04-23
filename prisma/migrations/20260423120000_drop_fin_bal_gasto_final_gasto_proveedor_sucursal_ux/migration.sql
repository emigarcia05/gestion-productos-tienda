-- Permitir varias filas `fin_bal_gasto_final` con el mismo gasto de catálogo, proveedor y sucursal.
DROP INDEX IF EXISTS "fin_bal_gasto_final_gasto_proveedor_sucursal_ux";
