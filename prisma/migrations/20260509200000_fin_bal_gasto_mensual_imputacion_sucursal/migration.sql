-- Sucursal elegida en UI al cargar un gasto eventual (catálogo sin sucursal);
-- si es NULL se usa la sucursal del `fin_bal_gasto_final` como hasta ahora.
ALTER TABLE "fin_bal_gasto_mensual" ADD COLUMN "imputacion_sucursal_id" TEXT;

ALTER TABLE "fin_bal_gasto_mensual"
ADD CONSTRAINT "fin_bal_gasto_mensual_imputacion_sucursal_id_fkey"
FOREIGN KEY ("imputacion_sucursal_id") REFERENCES "global_sucursales"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "fin_bal_gasto_mensual_imputacion_sucursal_id_idx"
ON "fin_bal_gasto_mensual"("imputacion_sucursal_id");
