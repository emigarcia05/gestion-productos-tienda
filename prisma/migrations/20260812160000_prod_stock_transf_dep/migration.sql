-- Control de transferencias entre depósitos (anti-duplicado reciente).
CREATE TABLE IF NOT EXISTS "prod_stock_transf_dep" (
    "id" TEXT NOT NULL,
    "cod_tienda" TEXT NOT NULL,
    "origen_codigo" TEXT NOT NULL,
    "destino_codigo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prod_stock_transf_dep_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prod_stock_transf_dep_cod_tienda_fkey'
  ) THEN
    ALTER TABLE "prod_stock_transf_dep"
      ADD CONSTRAINT "prod_stock_transf_dep_cod_tienda_fkey"
      FOREIGN KEY ("cod_tienda") REFERENCES "prod_tienda"("cod_tienda")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "prod_stock_transf_dep_dup_idx"
  ON "prod_stock_transf_dep"("cod_tienda", "origen_codigo", "destino_codigo", "cantidad", "created_at");

CREATE INDEX IF NOT EXISTS "prod_stock_transf_dep_par_fecha_idx"
  ON "prod_stock_transf_dep"("origen_codigo", "destino_codigo", "created_at");
