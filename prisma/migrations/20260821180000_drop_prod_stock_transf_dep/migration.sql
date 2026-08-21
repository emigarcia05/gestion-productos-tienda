-- Quita la cola Excel de transferencias (`prod_stock_transf_dep`).
-- Conserva el historial copiando filas que aún no están en `stock_trasn_depositos`.

INSERT INTO "stock_trasn_depositos" ("id", "cod_tienda", "cant", "suc_origen", "suc_destino", "created_at")
SELECT t."id", t."cod_tienda", t."cantidad", o."id", d."id", t."created_at"
FROM "prod_stock_transf_dep" t
INNER JOIN "global_sucursales" o ON o."codigo" = t."origen_codigo"
INNER JOIN "global_sucursales" d ON d."codigo" = t."destino_codigo"
WHERE t."origen_codigo" <> t."destino_codigo"
  AND t."cantidad" > 0
  AND NOT EXISTS (
    SELECT 1
    FROM "stock_trasn_depositos" s
    WHERE s."cod_tienda" = t."cod_tienda"
      AND s."cant" = t."cantidad"
      AND s."suc_origen" = o."id"
      AND s."suc_destino" = d."id"
      AND s."created_at" = t."created_at"
  )
ON CONFLICT ("id") DO NOTHING;

DROP TABLE IF EXISTS "prod_stock_transf_dep";
