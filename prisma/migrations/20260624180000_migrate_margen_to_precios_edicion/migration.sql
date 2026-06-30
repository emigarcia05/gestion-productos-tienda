-- Copia ediciones pendientes de margen → precio staging (Px Listas).
-- Fórmula alineada a calcPxListaDesdeMargenSinIvaPct: ROUND(costo * (1 + margen/100) * 1.21).
INSERT INTO "prod_tienda_precios_edicion" ("cod_tienda", "id_lista", "precio", "updated_at")
SELECT
  m."cod_tienda",
  m."id_lista",
  ROUND((t."costo_compra"::numeric * (1 + m."margen_manual"::numeric / 100) * 1.21))::numeric(14, 4),
  m."updated_at"
FROM "prod_tienda_margen_edicion" m
INNER JOIN "prod_tienda" t ON t."cod_tienda" = m."cod_tienda"
WHERE t."costo_compra" > 0
ON CONFLICT ("cod_tienda", "id_lista") DO UPDATE
SET
  "precio" = EXCLUDED."precio",
  "updated_at" = EXCLUDED."updated_at";
