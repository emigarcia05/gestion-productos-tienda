-- prod_precios_tienda: FK competidor para PX LISTA en Cx & Px (submódulo cx-px-tienda).
ALTER TABLE "prod_precios_tienda"
RENAME COLUMN "competencia_id_px_lista" TO "cx_px_px_comp_ref";

ALTER INDEX IF EXISTS "prod_precios_tienda_competencia_id_px_lista_idx"
RENAME TO "prod_precios_tienda_cx_px_px_comp_ref_idx";

ALTER TABLE "prod_precios_tienda"
RENAME CONSTRAINT "prod_precios_tienda_competencia_id_px_lista_fkey"
TO "prod_precios_tienda_cx_px_px_comp_ref_fkey";
