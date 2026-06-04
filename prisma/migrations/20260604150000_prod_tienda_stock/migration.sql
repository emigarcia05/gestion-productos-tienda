-- Stock multi-depósito DUX: prod_depositos_dux + prod_tienda_stock (patrón prod_listas_*)

-- ─── 1) Catálogo depósitos DUX ─────────────────────────────────────────────
CREATE TABLE "prod_depositos_dux" (
  "id_deposito" INTEGER NOT NULL,
  "nombre"        TEXT NOT NULL,
  "activa"        BOOLEAN NOT NULL DEFAULT true,
  "ultima_sync"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"    TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "prod_depositos_dux_pkey" PRIMARY KEY ("id_deposito")
);

-- ─── 2) Stock producto × depósito ──────────────────────────────────────────
CREATE TABLE "prod_tienda_stock" (
  "cod_tienda"      TEXT NOT NULL,
  "id_deposito"     INTEGER NOT NULL,
  "stock_real"      INTEGER NOT NULL DEFAULT 0,
  "ctd_disponible"  DECIMAL(14, 4),
  "updated_at"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "prod_tienda_stock_pkey" PRIMARY KEY ("cod_tienda", "id_deposito")
);

CREATE INDEX "prod_tienda_stock_id_deposito_idx"
  ON "prod_tienda_stock" ("id_deposito");

ALTER TABLE "prod_tienda_stock"
  ADD CONSTRAINT "prod_tienda_stock_cod_tienda_fkey"
  FOREIGN KEY ("cod_tienda") REFERENCES "prod_tienda" ("cod_tienda")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prod_tienda_stock"
  ADD CONSTRAINT "prod_tienda_stock_id_deposito_fkey"
  FOREIGN KEY ("id_deposito") REFERENCES "prod_depositos_dux" ("id_deposito")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── 3) Seed depósitos principales (IDs DUX TiendaColor) ───────────────────
INSERT INTO "prod_depositos_dux" ("id_deposito", "nombre", "activa", "ultima_sync", "created_at", "updated_at")
VALUES
  (4565, 'GUAYMALLÉN (backfill)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (16923, 'MAIPÚ (backfill)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id_deposito") DO NOTHING;

-- ─── 4) Backfill desde columnas legacy en prod_tienda ────────────────────────
INSERT INTO "prod_tienda_stock" ("cod_tienda", "id_deposito", "stock_real", "ctd_disponible", "updated_at")
SELECT "cod_tienda", 4565, COALESCE("stock_guaymallen", 0),
  CASE WHEN "stockeable" THEN 0::DECIMAL(14, 4) ELSE NULL END,
  CURRENT_TIMESTAMP
FROM "prod_tienda"
ON CONFLICT ("cod_tienda", "id_deposito") DO NOTHING;

INSERT INTO "prod_tienda_stock" ("cod_tienda", "id_deposito", "stock_real", "ctd_disponible", "updated_at")
SELECT "cod_tienda", 16923, COALESCE("stock_maipu", 0),
  CASE WHEN "stockeable" THEN 0::DECIMAL(14, 4) ELSE NULL END,
  CURRENT_TIMESTAMP
FROM "prod_tienda"
ON CONFLICT ("cod_tienda", "id_deposito") DO NOTHING;

-- ─── 5) Retirar columnas fijas de prod_tienda ──────────────────────────────
ALTER TABLE "prod_tienda" DROP COLUMN IF EXISTS "stock_maipu";
ALTER TABLE "prod_tienda" DROP COLUMN IF EXISTS "stock_guaymallen";
