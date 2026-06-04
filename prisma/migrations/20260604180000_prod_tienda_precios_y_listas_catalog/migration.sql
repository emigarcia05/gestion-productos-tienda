-- prod_tienda_listas_precios (hechos) → prod_tienda_precios
-- prod_listas_dux → prod_tienda_listas_precios (catálogo id_lista + nombre_lista)

-- ─── 1) Renombrar tabla de precios producto × lista ────────────────────────
ALTER TABLE "prod_tienda_listas_precios" RENAME TO "prod_tienda_precios";

ALTER INDEX IF EXISTS "prod_tienda_listas_precios_pkey"
  RENAME TO "prod_tienda_precios_pkey";

ALTER INDEX IF EXISTS "prod_tienda_listas_precios_id_lista_idx"
  RENAME TO "prod_tienda_precios_id_lista_idx";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prod_tienda_listas_precios_cod_tienda_fkey'
  ) THEN
    ALTER TABLE "prod_tienda_precios"
      RENAME CONSTRAINT "prod_tienda_listas_precios_cod_tienda_fkey"
      TO "prod_tienda_precios_cod_tienda_fkey";
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prod_tienda_listas_precios_id_lista_fkey'
  ) THEN
    ALTER TABLE "prod_tienda_precios"
      DROP CONSTRAINT "prod_tienda_listas_precios_id_lista_fkey";
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prod_listas_precios_tienda_id_lista_fkey'
  ) THEN
    ALTER TABLE "prod_tienda_precios"
      DROP CONSTRAINT "prod_listas_precios_tienda_id_lista_fkey";
  END IF;
END $$;

-- ─── 2) Catálogo prod_tienda_listas_precios (id_lista, nombre_lista) ───────
CREATE TABLE "prod_tienda_listas_precios" (
  "id_lista"      INTEGER NOT NULL,
  "nombre_lista"  TEXT NOT NULL,

  CONSTRAINT "prod_tienda_listas_precios_pkey" PRIMARY KEY ("id_lista")
);

INSERT INTO "prod_tienda_listas_precios" ("id_lista", "nombre_lista")
SELECT "id_lista", "nombre"
FROM "prod_listas_dux"
ON CONFLICT ("id_lista") DO NOTHING;

-- Listas solo en precios (por si faltó en prod_listas_dux)
INSERT INTO "prod_tienda_listas_precios" ("id_lista", "nombre_lista")
SELECT DISTINCT p."id_lista", 'LISTA ' || p."id_lista"::TEXT
FROM "prod_tienda_precios" p
WHERE NOT EXISTS (
  SELECT 1 FROM "prod_tienda_listas_precios" l WHERE l."id_lista" = p."id_lista"
)
ON CONFLICT ("id_lista") DO NOTHING;

ALTER TABLE "prod_tienda_precios"
  ADD CONSTRAINT "prod_tienda_precios_id_lista_fkey"
  FOREIGN KEY ("id_lista") REFERENCES "prod_tienda_listas_precios" ("id_lista")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE IF EXISTS "prod_listas_dux";
