-- Precios de lista DUX solo en prod_listas_precios_tienda (lista principal vía id_lista / DUX_ID_PRECIO_LISTA).
ALTER TABLE "prod_tienda" DROP COLUMN IF EXISTS "px_lista_tienda";
