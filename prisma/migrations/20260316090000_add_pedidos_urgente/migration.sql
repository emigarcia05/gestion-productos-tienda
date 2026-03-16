-- Tabla para almacenar las cantidades seleccionadas en el módulo "Pedido Urgente".
-- Estructura mínima pedida: id_proveedor, tipo_de_pedido, sucursal, cod_ext, cant_pedir.
-- Se agregan columnas estándar de auditoría (id, created_at, updated_at) para mantener consistencia con el resto del modelo.

CREATE TABLE IF NOT EXISTS "pedidos_urgente" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "id_proveedor" TEXT NOT NULL,
  "tipo_de_pedido" TEXT NOT NULL,
  "sucursal" TEXT NOT NULL,
  "cod_ext" TEXT NOT NULL,
  "cant_pedir" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de ayuda para consultas por proveedor/sucursal/tipo/cod_ext si se necesitan en el futuro.
CREATE INDEX IF NOT EXISTS "pedidos_urgente_proveedor_idx"
  ON "pedidos_urgente" ("id_proveedor");

CREATE INDEX IF NOT EXISTS "pedidos_urgente_sucursal_idx"
  ON "pedidos_urgente" ("sucursal");

CREATE INDEX IF NOT EXISTS "pedidos_urgente_tipo_pedido_idx"
  ON "pedidos_urgente" ("tipo_de_pedido");

CREATE INDEX IF NOT EXISTS "pedidos_urgente_cod_ext_idx"
  ON "pedidos_urgente" ("cod_ext");

