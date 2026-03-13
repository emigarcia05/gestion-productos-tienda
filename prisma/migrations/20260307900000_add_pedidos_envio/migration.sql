-- CreateTable
CREATE TABLE "pedidos_envio" (
    "id" TEXT NOT NULL,
    "id_proveedor" TEXT NOT NULL,
    "tipo_de_pedido" TEXT NOT NULL,
    "sucursal" TEXT NOT NULL,
    "cod_ext" TEXT NOT NULL,
    "cod_proveedor" TEXT NOT NULL,
    "cod_tienda" TEXT,
    "descripcion_proveedor" TEXT NOT NULL,
    "descripcion_tienda" TEXT,
    "cant_pedir" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_envio_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pedidos_envio" ADD CONSTRAINT "pedidos_envio_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
