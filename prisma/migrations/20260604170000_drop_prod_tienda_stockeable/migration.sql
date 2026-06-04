-- stockeable derivado en runtime desde prod_tienda_stock (ctd_disponible Maipú + Guaymallén)

ALTER TABLE "prod_tienda" DROP COLUMN IF EXISTS "stockeable";
