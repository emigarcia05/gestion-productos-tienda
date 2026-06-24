-- prod_precios_rex: alinear nombre de columna con prod_precios_provee.px_lista_proveedor.

ALTER TABLE "prod_precios_rex"
  RENAME COLUMN "precio" TO "px_lista_proveedor";
