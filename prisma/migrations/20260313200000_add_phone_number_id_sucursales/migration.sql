-- WhatsApp Cloud API: Phone Number ID por sucursal para envío sin abrir pestaña.
ALTER TABLE "sucursales" ADD COLUMN IF NOT EXISTS "phone_number_id" TEXT;
