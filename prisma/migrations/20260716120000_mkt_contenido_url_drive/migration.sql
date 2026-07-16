-- Base multimedia Marketing (archivos Drive: nombre, descripción, URL).
CREATE TABLE "mkt_contenido_url_drive" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mkt_contenido_url_drive_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mkt_contenido_url_drive_nombre_idx" ON "mkt_contenido_url_drive"("nombre");
