-- prod_precios_tienda → prod_tienda + listas DUX multi-precio
-- Patrón de rename: prisma/migrations/20260418290000_rename_7_tablas_prod_fin/migration.sql

-- ─── 1) Renombrar tabla producto tienda ───────────────────────────────────
ALTER TABLE "prod_precios_tienda" RENAME TO "prod_tienda";

-- ─── 2) Primary key e índices en prod_tienda ───────────────────────────────
ALTER INDEX IF EXISTS "prod_precios_tienda_pkey" RENAME TO "prod_tienda_pkey";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'prod_precios_tienda_cod_ext_key') THEN
    ALTER INDEX "prod_precios_tienda_cod_ext_key" RENAME TO "prod_tienda_cod_ext_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'lista_precios_tienda_cod_ext_key') THEN
    ALTER INDEX "lista_precios_tienda_cod_ext_key" RENAME TO "prod_tienda_cod_ext_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'prod_precios_tienda_costo_compra_cod_ext_idx') THEN
    ALTER INDEX "prod_precios_tienda_costo_compra_cod_ext_idx" RENAME TO "prod_tienda_costo_compra_cod_ext_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'prod_precios_tienda_ultima_exportacion_excel_idx') THEN
    ALTER INDEX "prod_precios_tienda_ultima_exportacion_excel_idx" RENAME TO "prod_tienda_ultima_exportacion_excel_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'prod_precios_tienda_cod_tienda_idx') THEN
    ALTER INDEX "prod_precios_tienda_cod_tienda_idx" RENAME TO "prod_tienda_cod_tienda_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'prod_precios_tienda_proveedor_idx') THEN
    ALTER INDEX "prod_precios_tienda_proveedor_idx" RENAME TO "prod_tienda_proveedor_idx";
  END IF;
END $$;

-- ─── 3) Constraints en prod_tienda ───────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prod_precios_tienda_id_marca_fkey') THEN
    ALTER TABLE "prod_tienda" RENAME CONSTRAINT "prod_precios_tienda_id_marca_fkey" TO "prod_tienda_id_marca_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lista_precios_tienda_id_marca_fkey') THEN
    ALTER TABLE "prod_tienda" RENAME CONSTRAINT "lista_precios_tienda_id_marca_fkey" TO "prod_tienda_id_marca_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prod_precios_tienda_costo_compra_cod_ext_fkey') THEN
    ALTER TABLE "prod_tienda" RENAME CONSTRAINT "prod_precios_tienda_costo_compra_cod_ext_fkey" TO "prod_tienda_costo_compra_cod_ext_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prod_precios_tienda_cx_px_cx_cod_ext_fkey') THEN
    ALTER TABLE "prod_tienda" RENAME CONSTRAINT "prod_precios_tienda_cx_px_cx_cod_ext_fkey" TO "prod_tienda_costo_compra_cod_ext_fkey";
  END IF;
END $$;

-- ─── 4) FKs que referencian prod_tienda (renombrar constraint, tabla ya apunta) ─
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prod_precios_provee_cod_tienda_fkey') THEN
    ALTER TABLE "prod_precios_provee" RENAME CONSTRAINT "prod_precios_provee_cod_tienda_fkey" TO "prod_precios_provee_cod_tienda_prod_tienda_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prod_precios_competencia_cod_tienda_fkey') THEN
    ALTER TABLE "prod_precios_competencia" RENAME CONSTRAINT "prod_precios_competencia_cod_tienda_fkey" TO "prod_precios_competencia_cod_tienda_prod_tienda_fkey";
  END IF;
END $$;

-- Trigger histórico reposición/stock (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'prod_tienda' AND t.tgname = 'trg_sync_reposicion_on_prod_precios_tienda_stock'
  ) THEN
    ALTER TRIGGER "trg_sync_reposicion_on_prod_precios_tienda_stock" ON "prod_tienda"
      RENAME TO "trg_sync_reposicion_on_prod_tienda_stock";
  END IF;
END $$;

-- ─── 5) Catálogo listas DUX ───────────────────────────────────────────────
CREATE TABLE "prod_listas_dux" (
  "id_lista"    INTEGER NOT NULL,
  "nombre"      TEXT NOT NULL,
  "activa"      BOOLEAN NOT NULL DEFAULT true,
  "ultima_sync" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"  TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "prod_listas_dux_pkey" PRIMARY KEY ("id_lista")
);

-- ─── 6) Precios producto × lista ──────────────────────────────────────────
CREATE TABLE "prod_listas_precios_tienda" (
  "cod_tienda"  TEXT NOT NULL,
  "id_lista"    INTEGER NOT NULL,
  "precio"      DECIMAL(14, 4) NOT NULL,
  "updated_at"  TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "prod_listas_precios_tienda_pkey" PRIMARY KEY ("cod_tienda", "id_lista")
);

CREATE INDEX "prod_listas_precios_tienda_id_lista_idx"
  ON "prod_listas_precios_tienda" ("id_lista");

ALTER TABLE "prod_listas_precios_tienda"
  ADD CONSTRAINT "prod_listas_precios_tienda_cod_tienda_fkey"
  FOREIGN KEY ("cod_tienda") REFERENCES "prod_tienda" ("cod_tienda")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prod_listas_precios_tienda"
  ADD CONSTRAINT "prod_listas_precios_tienda_id_lista_fkey"
  FOREIGN KEY ("id_lista") REFERENCES "prod_listas_dux" ("id_lista")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── 7) Backfill lista principal (56994) desde px_lista_tienda ─────────────
INSERT INTO "prod_listas_dux" ("id_lista", "nombre", "activa", "ultima_sync", "created_at", "updated_at")
VALUES (56994, 'LISTA PRINCIPAL (backfill)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id_lista") DO NOTHING;

INSERT INTO "prod_listas_precios_tienda" ("cod_tienda", "id_lista", "precio", "updated_at")
SELECT "cod_tienda", 56994, "px_lista_tienda", CURRENT_TIMESTAMP
FROM "prod_tienda"
WHERE "px_lista_tienda" > 0
ON CONFLICT ("cod_tienda", "id_lista") DO NOTHING;
