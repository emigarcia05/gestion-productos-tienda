-- prod_precios_tienda: marca de "Producto TiendaColor" (producto propio, no vincula con prod_precios_provee).
-- Se excluye del filtro VINCULADO=NO en /gestion-productos/tienda/comp-proveedores.
-- El sync DUX no toca esta columna (no se incluye en el `update` del upsert).
ALTER TABLE "prod_precios_tienda"
ADD COLUMN IF NOT EXISTS "es_producto_propio" BOOLEAN NOT NULL DEFAULT false;
