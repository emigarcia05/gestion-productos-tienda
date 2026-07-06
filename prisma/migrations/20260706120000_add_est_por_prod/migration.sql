-- Estadísticas de ventas en unidades por producto, sucursal y periodo.
CREATE TABLE "est_por_prod" (
    "id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "cod_tienda" TEXT NOT NULL,
    "vtas_en_un" DECIMAL(14, 4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "est_por_prod_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "est_por_prod_sucursal_id_fkey"
        FOREIGN KEY ("sucursal_id") REFERENCES "global_sucursales"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "est_por_prod_cod_tienda_fkey"
        FOREIGN KEY ("cod_tienda") REFERENCES "prod_tienda"("cod_tienda")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "est_por_prod_sucursal_periodo_cod_ux"
    ON "est_por_prod"("sucursal_id", "mes", "anio", "cod_tienda");

CREATE INDEX "est_por_prod_sucursal_id_idx" ON "est_por_prod"("sucursal_id");
CREATE INDEX "est_por_prod_anio_mes_idx" ON "est_por_prod"("anio", "mes");
CREATE INDEX "est_por_prod_cod_tienda_idx" ON "est_por_prod"("cod_tienda");
