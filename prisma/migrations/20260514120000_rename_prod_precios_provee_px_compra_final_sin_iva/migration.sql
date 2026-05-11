-- prod_precios_provee: columna generada (precio de compra neto de IVA del proveedor).
-- Renombrar px_compra_final → px_compra_final_sin_iva; la expresión GENERATED se mantiene.
ALTER TABLE "prod_precios_provee" RENAME COLUMN "px_compra_final" TO "px_compra_final_sin_iva";
