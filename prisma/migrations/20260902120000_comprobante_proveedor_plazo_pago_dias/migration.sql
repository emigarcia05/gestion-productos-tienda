-- Plazo de pago por comprobante (override opcional del proveedor).
ALTER TABLE "fin_compras_comprobante"
ADD COLUMN "plazo_pago_dias" INTEGER;
