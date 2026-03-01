-- Relación 1 (lista_precios_tienda) → N (lista_precios_proveedores).
-- Permite que un ítem del catálogo tienda esté vinculado a varios ítems de proveedores.

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
