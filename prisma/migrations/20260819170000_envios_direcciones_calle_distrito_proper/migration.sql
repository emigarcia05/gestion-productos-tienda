-- calle_nombre y distrito: proper case (primera letra de cada palabra).
UPDATE "envios_direcciones"
SET
  "calle_nombre" = CASE
    WHEN btrim("calle_nombre") = '' THEN btrim("calle_nombre")
    ELSE initcap(regexp_replace(btrim("calle_nombre"), '\s+', ' ', 'g'))
  END,
  "distrito" = CASE
    WHEN btrim("distrito") = '' THEN btrim("distrito")
    ELSE initcap(regexp_replace(btrim("distrito"), '\s+', ' ', 'g'))
  END;
