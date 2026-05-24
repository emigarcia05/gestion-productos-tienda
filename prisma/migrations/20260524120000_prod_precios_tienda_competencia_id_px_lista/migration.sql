-- Px Lista en Cx & Px Tienda: competidor elegido para referencia de precio (NULL = PX PROM.).
ALTER TABLE "prod_precios_tienda"
ADD COLUMN IF NOT EXISTS "competencia_id_px_lista" TEXT;

ALTER TABLE "prod_precios_tienda"
ADD CONSTRAINT "prod_precios_tienda_competencia_id_px_lista_fkey"
FOREIGN KEY ("competencia_id_px_lista") REFERENCES "prod_competencia" ("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "prod_precios_tienda_competencia_id_px_lista_idx"
ON "prod_precios_tienda" ("competencia_id_px_lista");
