-- Valor persistido de la columna MARCACION (Px Listas): (px_lista / costo_compra) / 1,21
ALTER TABLE "prod_precios_tienda_marcacion"
  ADD COLUMN IF NOT EXISTS "marcacion" DECIMAL(14, 5);
