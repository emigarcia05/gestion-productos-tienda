-- Add WhatsApp number column to proveedores (for Enviar Pedido module).
ALTER TABLE "proveedores" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;
