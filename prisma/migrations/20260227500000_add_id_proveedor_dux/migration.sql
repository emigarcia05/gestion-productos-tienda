-- Añade id_proveedor_dux a proveedores (ejecutar después del rename sufijo->prefijo).
ALTER TABLE "proveedores" ADD COLUMN IF NOT EXISTS "id_proveedor_dux" TEXT;
