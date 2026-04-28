-- Reconciliar configuración REPOSICION por cod_tienda con proveedor/cod_ext vigentes.
-- Objetivo: que cambios de proveedor en tienda impacten también en datos ya persistidos.

-- 1) Dedupe legacy: para cada sucursal + cod_tienda de REPOSICION, conservar solo la fila más reciente.
DELETE FROM "prod_ped_merc" p
USING (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "sucursal_id", TRIM(COALESCE("cod_tienda", ''))
        ORDER BY "updated_at" DESC, "id" DESC
      ) AS "rn"
    FROM "prod_ped_merc"
    WHERE "tipo_de_pedido" = 'REPOSICION'
      AND TRIM(COALESCE("cod_tienda", '')) <> ''
  ) d
  WHERE d."rn" > 1
) x
WHERE p."id" = x."id";

-- 2) Resolver proveedor/cod_ext actuales por cod_tienda y actualizar filas REPOSICION existentes.
WITH candidatos AS (
  SELECT
    p."id" AS "pedido_id",
    p."sucursal_id",
    p."cod_tienda",
    t."cod_ext" AS "cod_ext_new",
    lp."id_proveedor" AS "id_proveedor_new",
    lp."cod_prod_proveedor" AS "cod_proveedor_new",
    lp."descripcion_proveedor" AS "descripcion_proveedor_new",
    t."descripcion_tienda" AS "descripcion_tienda_new",
    ROW_NUMBER() OVER (
      PARTITION BY p."id"
      ORDER BY
        CASE
          WHEN UPPER(TRIM(COALESCE(gp."prefijo", ''))) = UPPER(TRIM(COALESCE(t."proveedor", '')))
            OR UPPER(TRIM(COALESCE(gp."nombre", ''))) = UPPER(TRIM(COALESCE(t."proveedor", '')))
          THEN 0
          ELSE 1
        END,
        lp."id_proveedor" ASC
    ) AS "rn"
  FROM "prod_ped_merc" p
  JOIN "prod_precios_tienda" t
    ON t."cod_tienda" = p."cod_tienda"
  JOIN "prod_precios_provee" lp
    ON lp."cod_ext" = t."cod_ext"
  JOIN "global_proveedores" gp
    ON gp."id" = lp."id_proveedor"
  WHERE p."tipo_de_pedido" = 'REPOSICION'
    AND TRIM(COALESCE(p."cod_tienda", '')) <> ''
), elegidos AS (
  SELECT *
  FROM candidatos
  WHERE "rn" = 1
)
UPDATE "prod_ped_merc" p
SET
  "id_proveedor" = e."id_proveedor_new",
  "cod_ext" = e."cod_ext_new",
  "cod_proveedor" = TRIM(COALESCE(e."cod_proveedor_new", '')),
  "descripcion_proveedor" = e."descripcion_proveedor_new",
  "descripcion_tienda" = NULLIF(TRIM(COALESCE(e."descripcion_tienda_new", '')), '')
FROM elegidos e
WHERE p."id" = e."pedido_id";
