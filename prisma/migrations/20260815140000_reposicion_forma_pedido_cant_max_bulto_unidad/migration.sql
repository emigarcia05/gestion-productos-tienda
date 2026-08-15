-- Forma de pedido: CANT_MAXIMA → CANT_MAX; CANT_FIJA → CANT_FIJA_POR_BULTO.
-- Queda disponible CANT_FIJA_POR_UNIDAD (Pedido A Fáb.).
UPDATE "prod_ped_merc"
SET "reposicion_forma_pedido" = 'CANT_MAX'
WHERE UPPER(TRIM(COALESCE("reposicion_forma_pedido", ''))) IN (
  'CANT_MAXIMA',
  'CANT. MAX.',
  'CANT_MAX'
);

UPDATE "prod_ped_merc"
SET "reposicion_forma_pedido" = 'CANT_FIJA_POR_BULTO'
WHERE UPPER(TRIM(COALESCE("reposicion_forma_pedido", ''))) IN (
  'CANT_FIJA',
  'CANT. FIJA',
  'CANT_FIJA_POR_BULTO'
);
