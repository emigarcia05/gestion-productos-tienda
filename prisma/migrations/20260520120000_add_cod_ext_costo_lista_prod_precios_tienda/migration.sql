-- Costo mostrado en Cx/Px Tienda: FK a la fila de lista proveedor elegida (px_compra_final_sin_iva).
ALTER TABLE "prod_precios_tienda"
ADD COLUMN IF NOT EXISTS "cod_ext_costo_lista" TEXT;

ALTER TABLE "prod_precios_tienda"
ADD CONSTRAINT "prod_precios_tienda_cod_ext_costo_lista_fkey"
FOREIGN KEY ("cod_ext_costo_lista") REFERENCES "prod_precios_provee" ("cod_ext")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "prod_precios_tienda_cod_ext_costo_lista_idx"
ON "prod_precios_tienda" ("cod_ext_costo_lista");

-- Backfill: único vínculo habilitado por cod_tienda.
UPDATE "prod_precios_tienda" AS t
SET "cod_ext_costo_lista" = sub."cod_ext"
FROM (
  SELECT "cod_tienda", MIN("cod_ext") AS "cod_ext"
  FROM "prod_precios_provee"
  WHERE "cod_tienda" IS NOT NULL AND "habilitado" = TRUE
  GROUP BY "cod_tienda"
  HAVING COUNT(*) = 1
) AS sub
WHERE t."cod_tienda" = sub."cod_tienda"
  AND t."cod_ext_costo_lista" IS NULL;

-- Backfill: proveedor que coincide con texto DUX (prod_precios_tienda.proveedor).
UPDATE "prod_precios_tienda" AS t
SET "cod_ext_costo_lista" = lp."cod_ext"
FROM "prod_precios_provee" AS lp
INNER JOIN "global_proveedores" AS p ON p."id" = lp."id_proveedor"
WHERE lp."cod_tienda" = t."cod_tienda"
  AND lp."habilitado" = TRUE
  AND t."cod_ext_costo_lista" IS NULL
  AND TRIM(COALESCE(t."proveedor", '')) <> ''
  AND (
    LOWER(TRIM(t."proveedor")) = LOWER(TRIM(p."nombre"))
    OR (
      TRIM(COALESCE(p."prefijo", '')) <> ''
      AND LOWER(TRIM(t."proveedor")) = LOWER(TRIM(p."prefijo"))
    )
  );
