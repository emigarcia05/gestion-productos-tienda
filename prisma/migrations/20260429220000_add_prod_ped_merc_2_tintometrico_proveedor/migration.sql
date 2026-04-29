-- Columna `tintometrico_proveedor` en `prod_ped_merc_2` (referencia al proveedor en ítems tintométricos).

ALTER TABLE "prod_ped_merc_2"
ADD COLUMN IF NOT EXISTS "tintometrico_proveedor" TEXT;

-- Backfill: `id_proveedor` desde `prod_ped_merc` para filas TINTOMETRICO con el mismo `id`.
UPDATE "prod_ped_merc_2" t2
SET "tintometrico_proveedor" = NULLIF(TRIM(COALESCE(pm."id_proveedor", '')), '')
FROM "prod_ped_merc" pm
WHERE t2."id" = pm."id"
  AND pm."tipo_de_pedido" = 'TINTOMETRICO';
