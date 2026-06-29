-- Margen % manual por producto × lista en Px Listas (independiente del sync DUX).
CREATE TABLE "prod_tienda_margen_edicion" (
  "cod_tienda" TEXT NOT NULL,
  "id_lista" INTEGER NOT NULL,
  "margen_manual" DECIMAL(8, 4) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "prod_tienda_margen_edicion_pkey" PRIMARY KEY ("cod_tienda", "id_lista"),
  CONSTRAINT "prod_tienda_margen_edicion_cod_tienda_fkey"
    FOREIGN KEY ("cod_tienda") REFERENCES "prod_tienda"("cod_tienda") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "prod_tienda_margen_edicion_id_lista_fkey"
    FOREIGN KEY ("id_lista") REFERENCES "prod_tienda_listas_precios"("id_lista") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "prod_tienda_margen_edicion_id_lista_idx"
  ON "prod_tienda_margen_edicion"("id_lista");
