-- prod_precios_tienda: `cod_ext` pasa a ser opcional.
-- A partir de 2026-05-28 el sync DUX deja de escribir `cod_ext` y `proveedor` (la
-- vinculación tienda ↔ proveedor se hace 100 % manual vía `prod_precios_provee.cod_tienda`).
-- Los valores legacy se preservan para trazabilidad histórica.
ALTER TABLE "prod_precios_tienda"
ALTER COLUMN "cod_ext" DROP NOT NULL;
