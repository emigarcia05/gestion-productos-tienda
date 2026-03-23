-- DEPÓSITO para exportar recepción de pedido a formato DUX.
-- Se agrega como TEXT para preservar ceros a la izquierda y evitar problemas de formato.

ALTER TABLE "sucursales"
  ADD COLUMN IF NOT EXISTS "deposito" TEXT;

