-- Pendientes de export Excel por lado origen/destino.
ALTER TABLE "prod_stock_transf_dep"
  ADD COLUMN IF NOT EXISTS "exportado_origen_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "exportado_destino_at" TIMESTAMP(3);

-- Filas históricas: no mostrarlas como pendientes de importación DUX.
UPDATE "prod_stock_transf_dep"
SET
  "exportado_origen_at" = COALESCE("exportado_origen_at", "created_at"),
  "exportado_destino_at" = COALESCE("exportado_destino_at", "created_at")
WHERE "exportado_origen_at" IS NULL
   OR "exportado_destino_at" IS NULL;

CREATE INDEX IF NOT EXISTS "prod_stock_transf_dep_origen_export_idx"
  ON "prod_stock_transf_dep"("origen_codigo", "exportado_origen_at");

CREATE INDEX IF NOT EXISTS "prod_stock_transf_dep_destino_export_idx"
  ON "prod_stock_transf_dep"("destino_codigo", "exportado_destino_at");
