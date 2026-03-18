-- WhatsApp Cloud API: Phone Number ID por sucursal para envío sin abrir pestaña.
-- Nota: esta migración también asegura la existencia de la tabla `sucursales`
-- para que el historial aplique limpiamente en shadow DB.

CREATE TABLE IF NOT EXISTS "sucursales" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "whatsapp" TEXT,
    "phone_number_id" TEXT,
    "id_dux" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sucursales_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sucursales_codigo_key" ON "sucursales"("codigo");

ALTER TABLE "sucursales" ADD COLUMN IF NOT EXISTS "phone_number_id" TEXT;
