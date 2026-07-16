-- Colores de marca (Base Multimedia).
CREATE TABLE "mkt_colores_marca" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "cod_hexadecimales" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mkt_colores_marca_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mkt_colores_marca_nombre_idx" ON "mkt_colores_marca"("nombre");
