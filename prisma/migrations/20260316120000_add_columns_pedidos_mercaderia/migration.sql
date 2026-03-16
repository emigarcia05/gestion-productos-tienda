-- Añadir columnas nuevas a pedidos_mercaderia (reposición, urgente, tintométrico).
ALTER TABLE "pedidos_mercaderia" ADD COLUMN IF NOT EXISTS "forma_pedido_reposicion" TEXT;
ALTER TABLE "pedidos_mercaderia" ADD COLUMN IF NOT EXISTS "punto_pedido" INTEGER;
ALTER TABLE "pedidos_mercaderia" ADD COLUMN IF NOT EXISTS "cant_pedir_reposicion" INTEGER DEFAULT 0;
ALTER TABLE "pedidos_mercaderia" ADD COLUMN IF NOT EXISTS "cant_pedir_urgente" INTEGER DEFAULT 0;
ALTER TABLE "pedidos_mercaderia" ADD COLUMN IF NOT EXISTS "cant_pedir_tintometrico" INTEGER DEFAULT 0;
ALTER TABLE "pedidos_mercaderia" ADD COLUMN IF NOT EXISTS "descripcion_tintometrico" TEXT;
