-- Corrige nombres de columnas en lista_precios_proveedores.
-- Mapeo: DESC. PROD. -> dto_producto, DESC. CANT. -> dto_cantidad, CX. APROX TRANSPORTE -> cx_aprox_transporte

DO $$
BEGIN
  -- DESC. PROD. -> dto_producto (descuento_producto, desc_prod, etc.)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lista_precios_proveedores' AND column_name = 'descuento_producto')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lista_precios_proveedores' AND column_name = 'dto_producto') THEN
    ALTER TABLE lista_precios_proveedores RENAME COLUMN descuento_producto TO dto_producto;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lista_precios_proveedores' AND column_name = 'desc_prod')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lista_precios_proveedores' AND column_name = 'dto_producto') THEN
    ALTER TABLE lista_precios_proveedores RENAME COLUMN desc_prod TO dto_producto;
  END IF;

  -- DESC. CANT. -> dto_cantidad (descuento_cantidad, desc_cant, etc.)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lista_precios_proveedores' AND column_name = 'descuento_cantidad')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lista_precios_proveedores' AND column_name = 'dto_cantidad') THEN
    ALTER TABLE lista_precios_proveedores RENAME COLUMN descuento_cantidad TO dto_cantidad;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lista_precios_proveedores' AND column_name = 'desc_cant')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lista_precios_proveedores' AND column_name = 'dto_cantidad') THEN
    ALTER TABLE lista_precios_proveedores RENAME COLUMN desc_cant TO dto_cantidad;
  END IF;

  -- CX. APROX TRANSPORTE -> cx_aprox_transporte (cx_transporte, costo_aprox_transporte, etc.)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lista_precios_proveedores' AND column_name = 'cx_transporte')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lista_precios_proveedores' AND column_name = 'cx_aprox_transporte') THEN
    ALTER TABLE lista_precios_proveedores RENAME COLUMN cx_transporte TO cx_aprox_transporte;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lista_precios_proveedores' AND column_name = 'costo_aprox_transporte')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lista_precios_proveedores' AND column_name = 'cx_aprox_transporte') THEN
    ALTER TABLE lista_precios_proveedores RENAME COLUMN costo_aprox_transporte TO cx_aprox_transporte;
  END IF;
END $$;
