-- Asegura que lista_precios_proveedores exista (por si la inicial no creó la tabla en shadow DB).
CREATE TABLE IF NOT EXISTS "lista_precios_proveedores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_proveedor" TEXT NOT NULL,
    "cod_prod_proveedor" TEXT NOT NULL,
    "descripcion_proveedor" TEXT NOT NULL,
    "cod_ext" TEXT NOT NULL,
    "px_lista_proveedor" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "descuento_producto" INTEGER NOT NULL DEFAULT 0,
    "descuento_cantidad" INTEGER NOT NULL DEFAULT 0,
    "cx_transporte" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lista_precios_proveedores_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lista_precios_proveedores_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "lista_precios_proveedores_cod_ext_key" ON "lista_precios_proveedores"("cod_ext");
