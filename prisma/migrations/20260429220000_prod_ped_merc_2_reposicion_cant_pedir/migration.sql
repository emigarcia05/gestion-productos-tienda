-- Cantidad a pedir en reposición (sobrestock / copia desde legado cuando comparten `id`).
-- `NULL` = la app deriva la cantidad con la fórmula stock + forma (como en tabla Generar Pedido).
ALTER TABLE "prod_ped_merc_2"
ADD COLUMN IF NOT EXISTS "reposicion_cant_pedir" INTEGER;

UPDATE "prod_ped_merc_2" m2
SET "reposicion_cant_pedir" = COALESCE(pm."reposicion_cant_pedir", 0)
FROM "prod_ped_merc" pm
WHERE pm."id" = m2."id"
  AND m2."tipo_de_pedido" = 'REPOSICION';
