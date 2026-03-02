-- Columna dto_proveedor (descuento proveedor en %) en lista_precios_proveedores.
ALTER TABLE "lista_precios_proveedores" ADD COLUMN IF NOT EXISTS "dto_proveedor" INTEGER NOT NULL DEFAULT 0;
