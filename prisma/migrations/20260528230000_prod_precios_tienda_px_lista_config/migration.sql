-- Marcación Px Listas por ítem tienda (una lista por ahora; extensible luego).
CREATE TABLE IF NOT EXISTS "prod_precios_tienda_marcacion" (
  "cod_tienda" TEXT NOT NULL,
  "det_precio_manual" BOOLEAN NOT NULL DEFAULT true,
  "competencia_id" TEXT,
  "px_lista_manual" DECIMAL(14, 4),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prod_precios_tienda_marcacion_pkey" PRIMARY KEY ("cod_tienda"),
  CONSTRAINT "prod_precios_tienda_marcacion_cod_tienda_fkey"
    FOREIGN KEY ("cod_tienda") REFERENCES "prod_precios_tienda"("cod_tienda") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "prod_precios_tienda_marcacion_competencia_id_fkey"
    FOREIGN KEY ("competencia_id") REFERENCES "prod_competencia"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "prod_precios_tienda_marcacion_competencia_id_idx"
  ON "prod_precios_tienda_marcacion"("competencia_id");
