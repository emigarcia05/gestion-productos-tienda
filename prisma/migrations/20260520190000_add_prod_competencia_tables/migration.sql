-- Competidores y precios scrapeados por ítem tienda
CREATE TABLE "prod_competencia" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "web" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prod_competencia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prod_competencia_nombre_key" ON "prod_competencia"("nombre");

CREATE TABLE "prod_precios_competencia" (
    "cod_tienda" TEXT NOT NULL,
    "competencia_id" TEXT NOT NULL,
    "px_competencia" DECIMAL(14,4),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prod_precios_competencia_pkey" PRIMARY KEY ("cod_tienda","competencia_id")
);

CREATE INDEX "prod_precios_competencia_competencia_id_idx" ON "prod_precios_competencia"("competencia_id");

ALTER TABLE "prod_precios_competencia" ADD CONSTRAINT "prod_precios_competencia_cod_tienda_fkey" FOREIGN KEY ("cod_tienda") REFERENCES "prod_precios_tienda"("cod_tienda") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prod_precios_competencia" ADD CONSTRAINT "prod_precios_competencia_competencia_id_fkey" FOREIGN KEY ("competencia_id") REFERENCES "prod_competencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
