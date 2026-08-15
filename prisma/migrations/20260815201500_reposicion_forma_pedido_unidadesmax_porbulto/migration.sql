-- Canonicalizar valores de reposicion_forma_pedido:
-- CANT_MAX -> UNIDADES_MAX
-- CANT_FIJA_POR_BULTO -> POR_BULTO
-- Se conserva CANT_FIJA_POR_UNIDAD para Pedido A Fábrica.

UPDATE "prod_ped_merc"
SET "reposicion_forma_pedido" = 'UNIDADES_MAX'
WHERE UPPER(TRIM(COALESCE("reposicion_forma_pedido", ''))) IN (
  'UNIDADES_MAX',
  'CANT_MAX',
  'CANT_MAXIMA',
  'CANT. MAX.'
);

UPDATE "prod_ped_merc"
SET "reposicion_forma_pedido" = 'POR_BULTO'
WHERE UPPER(TRIM(COALESCE("reposicion_forma_pedido", ''))) IN (
  'POR_BULTO',
  'CANT_FIJA_POR_BULTO',
  'CANT_FIJA',
  'CANT. FIJA'
);

ALTER TABLE "prod_ped_merc"
DROP CONSTRAINT IF EXISTS "prod_ped_merc_reposicion_forma_pedido_check";

ALTER TABLE "prod_ped_merc"
ADD CONSTRAINT "prod_ped_merc_reposicion_forma_pedido_check"
CHECK (
  "reposicion_forma_pedido" IS NULL OR
  "reposicion_forma_pedido" IN (
    'UNIDADES_MAX',
    'POR_BULTO',
    'CANT_FIJA_POR_UNIDAD'
  )
);
