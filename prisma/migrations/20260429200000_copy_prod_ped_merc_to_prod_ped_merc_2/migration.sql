-- Copia desde `prod_ped_merc` → `prod_ped_merc_2` solo las columnas acordadas.
-- Las demás columnas de `prod_ped_merc_2` quedan con sus DEFAULT / NULL.
-- Idempotente: si el `id` ya existe, actualiza los mismos campos desde origen.

INSERT INTO "prod_ped_merc_2" (
    "id",
    "tipo_de_pedido",
    "sucursal_id",
    "reposicion_forma_pedido",
    "reposicion_punto_pedido",
    "reposicion_cant_conf"
)
SELECT
    pm."id",
    pm."tipo_de_pedido",
    pm."sucursal_id",
    pm."reposicion_forma_pedido",
    pm."reposicion_punto_pedido",
    pm."reposicion_cant_conf"
FROM "prod_ped_merc" pm
WHERE pm."tipo_de_pedido" IN ('REPOSICION', 'URGENTE', 'TINTOMETRICO')
ON CONFLICT ("id") DO UPDATE SET
    "tipo_de_pedido" = EXCLUDED."tipo_de_pedido",
    "sucursal_id" = EXCLUDED."sucursal_id",
    "reposicion_forma_pedido" = EXCLUDED."reposicion_forma_pedido",
    "reposicion_punto_pedido" = EXCLUDED."reposicion_punto_pedido",
    "reposicion_cant_conf" = EXCLUDED."reposicion_cant_conf";
