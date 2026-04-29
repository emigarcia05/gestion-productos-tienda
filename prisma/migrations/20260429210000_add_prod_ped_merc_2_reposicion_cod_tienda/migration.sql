-- Columna `reposicion_cod_tienda` en `prod_ped_merc_2` (código tienda para reposición).

ALTER TABLE "prod_ped_merc_2"
ADD COLUMN IF NOT EXISTS "reposicion_cod_tienda" TEXT;

CREATE INDEX IF NOT EXISTS "prod_ped_merc_2_reposicion_cod_tienda_idx"
ON "prod_ped_merc_2" ("reposicion_cod_tienda");

-- Rellenar desde `prod_ped_merc` donde exista vínculo por mismo `id` y tipo REPOSICION.
UPDATE "prod_ped_merc_2" t2
SET "reposicion_cod_tienda" = NULLIF(TRIM(COALESCE(pm."cod_tienda", '')), '')
FROM "prod_ped_merc" pm
WHERE t2."id" = pm."id"
  AND pm."tipo_de_pedido" = 'REPOSICION';
