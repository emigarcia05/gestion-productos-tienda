-- prod_precios_tienda_marcacion.marcacion: de factor multiplicador (px/costo/1,21)
-- a % utilidad sin IVA: (valor_anterior - 1) * 100.
UPDATE "prod_precios_tienda_marcacion"
SET "marcacion" = ("marcacion" - 1) * 100
WHERE "marcacion" IS NOT NULL;
