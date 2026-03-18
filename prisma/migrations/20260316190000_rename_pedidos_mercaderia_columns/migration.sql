-- Renombrar columnas en pedidos_mercaderia (Neon).
-- Nota: Postgres no soporta `RENAME COLUMN IF EXISTS`.
-- Usar bloques DO para tolerar entornos ya migrados/parciales.

DO $$
BEGIN
  ALTER TABLE "pedidos_mercaderia"
    RENAME COLUMN "forma_pedido_reposicion" TO "reposicion_forma_pedido";
EXCEPTION
  WHEN undefined_column THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "pedidos_mercaderia"
    RENAME COLUMN "punto_pedido" TO "reposicion_punto_pedido";
EXCEPTION
  WHEN undefined_column THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "pedidos_mercaderia"
    RENAME COLUMN "cant_pedir_reposicion" TO "reposicion_cant_conf";
EXCEPTION
  WHEN undefined_column THEN
    NULL;
END $$;

ALTER TABLE "pedidos_mercaderia"
  ADD COLUMN IF NOT EXISTS "reposicion_cant_pedir" INTEGER DEFAULT 0;

DO $$
BEGIN
  ALTER TABLE "pedidos_mercaderia"
    RENAME COLUMN "cant_pedir_urgente" TO "urgente_cant_pedir";
EXCEPTION
  WHEN undefined_column THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "pedidos_mercaderia"
    RENAME COLUMN "cant_pedir_tintometrico" TO "tintometrio_cant_pedir";
EXCEPTION
  WHEN undefined_column THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "pedidos_mercaderia"
    RENAME COLUMN "descripcion_tintometrico" TO "tintometrico_descripcion";
EXCEPTION
  WHEN undefined_column THEN
    NULL;
END $$;

