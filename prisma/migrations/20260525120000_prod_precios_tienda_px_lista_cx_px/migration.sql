-- Precio PX LISTA elegido en Cx & Px Tienda (independiente del espejo DUX `px_lista_tienda`).
ALTER TABLE "prod_precios_tienda"
ADD COLUMN IF NOT EXISTS "px_lista_cx_px" DECIMAL(14, 4);
