-- Canonicalizar valor de reposicion_forma_pedido:
-- CANT_FIJA_POR_UNIDAD -> UNIDADES_FIJAS
-- Mantener aliases históricos solo en capa de lectura (normalizador TS).

UPDATE "prod_ped_merc"
SET "reposicion_forma_pedido" = 'UNIDADES_FIJAS'
WHERE UPPER(TRIM(COALESCE("reposicion_forma_pedido", ''))) IN (
  'UNIDADES_FIJAS',
  'CANT_FIJA_POR_UNIDAD'
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
    'UNIDADES_FIJAS'
  )
);
