-- Historial de pedidos (cabecera + items editables)

CREATE TABLE "pedidos_historia" (
    "id" TEXT NOT NULL,
    "generado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'PEDIDO',
    "registrado_at" TIMESTAMP(3),
    "proveedor_id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_historia_pkey" PRIMARY KEY ("id")
);

-- pedido_historia -> proveedores/sucursales
ALTER TABLE "pedidos_historia" ADD CONSTRAINT "pedidos_historia_proveedor_id_fkey"
FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pedidos_historia" ADD CONSTRAINT "pedidos_historia_sucursal_id_fkey"
FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "pedidos_historia_items" (
    "id" TEXT NOT NULL,
    "pedido_historia_id" TEXT NOT NULL,
    "cod_tienda" TEXT NOT NULL,
    "cant_pedida" INTEGER NOT NULL DEFAULT 0,
    "cant_recibida" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_historia_items_pkey" PRIMARY KEY ("id")
);

-- pedido_historia_items -> pedidos_historia
ALTER TABLE "pedidos_historia_items" ADD CONSTRAINT "pedidos_historia_items_pedido_historia_id_fkey"
FOREIGN KEY ("pedido_historia_id") REFERENCES "pedidos_historia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Índices y unicidad
CREATE INDEX "pedidos_historia_sucursal_id_generado_at_idx" ON "pedidos_historia"("sucursal_id", "generado_at");
CREATE INDEX "pedidos_historia_proveedor_id_generado_at_idx" ON "pedidos_historia"("proveedor_id", "generado_at");

CREATE UNIQUE INDEX "pedidos_historia_items_pedido_historia_id_cod_tienda_key"
ON "pedidos_historia_items"("pedido_historia_id", "cod_tienda");

CREATE INDEX "pedidos_historia_items_pedido_historia_id_idx" ON "pedidos_historia_items"("pedido_historia_id");

