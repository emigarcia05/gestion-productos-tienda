-- Renombrar columnas en pedidos_mercaderia (Neon).
-- Nota: usar IF EXISTS para tolerar entornos ya migrados/parciales.

ALTER TABLE "pedidos_mercaderia"
  RENAME COLUMN IF EXISTS "forma_pedido_reposicion" TO "reposicion_forma_pedido";

ALTER TABLE "pedidos_mercaderia"
  RENAME COLUMN IF EXISTS "punto_pedido" TO "reposicion_punto_pedido";

ALTER TABLE "pedidos_mercaderia"
  RENAME COLUMN IF EXISTS "cant_pedir_reposicion" TO "reposicion_cant_conf";

ALTER TABLE "pedidos_mercaderia"
  ADD COLUMN IF NOT EXISTS "reposicion_cant_pedir" INTEGER DEFAULT 0;

ALTER TABLE "pedidos_mercaderia"
  RENAME COLUMN IF EXISTS "cant_pedir_urgente" TO "urgente_cant_pedir";

ALTER TABLE "pedidos_mercaderia"
  RENAME COLUMN IF EXISTS "cant_pedir_tintometrico" TO "tintometrio_cant_pedir";

ALTER TABLE "pedidos_mercaderia"
  RENAME COLUMN IF EXISTS "descripcion_tintometrico" TO "tintometrico_descripcion";

