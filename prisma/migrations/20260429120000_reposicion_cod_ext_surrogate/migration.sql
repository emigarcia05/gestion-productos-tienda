-- REPOSICION: normalizar `cod_ext` en filas ya existentes.
-- No se guarda el cod_ext comercial; el negocio usa `cod_tienda`. El unique de BD
-- requiere un valor por fila → surrogado `REPO_TIENDA:{cod_tienda}`.

-- 1) Dedupe: misma sucursal + cod_tienda, una sola fila (la más reciente).
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

-- 2) Sustituir cod_ext legado por surrogado (ítems con cod_tienda).
UPDATE "prod_ped_merc"
SET "cod_ext" = 'REPO_TIENDA:' || TRIM("cod_tienda")
WHERE "tipo_de_pedido" = 'REPOSICION'
  AND TRIM(COALESCE("cod_tienda", '')) <> ''
  AND "cod_ext" IS DISTINCT FROM ('REPO_TIENDA:' || TRIM("cod_tienda"));
