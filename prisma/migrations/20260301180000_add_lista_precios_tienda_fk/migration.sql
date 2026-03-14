-- Relación 1 (lista_precios_tienda) → N (lista_precios_proveedores).
-- Permite que un ítem del catálogo tienda esté vinculado a varios ítems de proveedores.

-- 0. Crear tabla si no existe (shadow DB puede no tenerla si la inicial no corrió)
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

-- 1. Añadir columna FK en lista_precios_proveedores (nullable para datos existentes)
ALTER TABLE "lista_precios_proveedores"
ADD COLUMN IF NOT EXISTS "id_lista_precios_tienda" UUID NULL;

-- 2. Quitar UNIQUE de cod_ext para permitir varios proveedores con el mismo cod_ext
ALTER TABLE "lista_precios_proveedores"
DROP CONSTRAINT IF EXISTS "lista_precios_proveedores_cod_ext_key";

-- 3. Añadir FK hacia lista_precios_tienda (ON DELETE SET NULL para no borrar proveedores si se borra tienda)
ALTER TABLE "lista_precios_proveedores"
ADD CONSTRAINT "lista_precios_proveedores_id_lista_precios_tienda_fkey"
FOREIGN KEY ("id_lista_precios_tienda") REFERENCES "lista_precios_tienda"("id") ON DELETE SET NULL ON UPDATE CASCADE;
