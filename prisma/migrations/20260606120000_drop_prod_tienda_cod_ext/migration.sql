-- Elimina `prod_tienda.cod_ext`: dejó de sincronizarse en 2026-05-28 (§1.4.2) y ya no se usa en app.
-- La vinculación tienda ↔ proveedor es 100 % manual vía `prod_precios_provee.cod_tienda`.
DROP INDEX IF EXISTS "prod_tienda_cod_ext_key";

ALTER TABLE "prod_tienda" DROP COLUMN IF EXISTS "cod_ext";
