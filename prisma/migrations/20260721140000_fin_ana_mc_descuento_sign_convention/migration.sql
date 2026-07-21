-- Convención Margen Contribución: descuento_pct negativo = descuento (baja PX VENTA),
-- positivo = recargo. Antesición: los valores previos usaban positivo = descuento.
UPDATE "fin_ana_mc_descuento_fp"
SET "descuento_pct" = -"descuento_pct"
WHERE "descuento_pct" <> 0;
