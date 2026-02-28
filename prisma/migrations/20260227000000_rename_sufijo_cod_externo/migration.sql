-- Rename columns: proveedores.sufijo -> prefijo, lista_precios_tienda.cod_externo -> cod_ext
ALTER TABLE "proveedores" RENAME COLUMN "sufijo" TO "prefijo";
ALTER TABLE "lista_precios_tienda" RENAME COLUMN "cod_externo" TO "cod_ext";
