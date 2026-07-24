-- Categorías de M.C. por rango % continuo [desde, hasta) en 0…100.

CREATE TABLE "fin_ana_mc_categorias" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "desde_pct" INTEGER NOT NULL,
    "hasta_pct" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_ana_mc_categorias_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fin_ana_mc_categorias_rango_check" CHECK ("desde_pct" >= 0 AND "hasta_pct" <= 100 AND "desde_pct" < "hasta_pct")
);

CREATE UNIQUE INDEX "fin_ana_mc_categorias_categoria_key" ON "fin_ana_mc_categorias"("categoria");
CREATE INDEX "fin_ana_mc_categorias_desde_pct_idx" ON "fin_ana_mc_categorias"("desde_pct");

INSERT INTO "fin_ana_mc_categorias" ("id", "categoria", "desde_pct", "hasta_pct", "orden", "created_at", "updated_at")
VALUES
    ('clfinamccat0000000000001', 'MUY BAJO', 0, 20, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinamccat0000000000002', 'BAJO', 20, 40, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinamccat0000000000003', 'MEDIO', 40, 60, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinamccat0000000000004', 'ALTO', 60, 80, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clfinamccat0000000000005', 'MUY ALTO', 80, 100, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
