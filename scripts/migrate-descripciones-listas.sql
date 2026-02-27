-- Migración de estructura:
-- 1) lista_precios_proveedores: agregar descripcion_proveedor (TEXT)
-- 2) lista_precios_tienda: renombrar descripcion -> descripcion_tienda
--
-- Ejecutar: npm run db:migrate-descripciones

-- 1) Agregar columna nueva (no rompe datos existentes)
ALTER TABLE lista_precios_proveedores
  ADD COLUMN IF NOT EXISTS descripcion_proveedor TEXT;

COMMENT ON COLUMN lista_precios_proveedores.descripcion_proveedor
  IS 'Descripción informada por el proveedor (importada desde su lista)';

-- 2) Renombrar columna de tienda si existe la vieja y no existe la nueva
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lista_precios_tienda'
      AND column_name = 'descripcion'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lista_precios_tienda'
      AND column_name = 'descripcion_tienda'
  ) THEN
    ALTER TABLE lista_precios_tienda RENAME COLUMN descripcion TO descripcion_tienda;
  END IF;
END $$;

COMMENT ON COLUMN lista_precios_tienda.descripcion_tienda
  IS 'Descripción provista por la API de tienda';

