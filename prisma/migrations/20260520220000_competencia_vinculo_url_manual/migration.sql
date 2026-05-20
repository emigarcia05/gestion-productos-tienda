-- Quitar búsqueda automática a nivel competidor
ALTER TABLE "prod_competencia" DROP COLUMN IF EXISTS "url_busqueda";

-- Vínculo manual producto tienda × competidor
ALTER TABLE "prod_precios_competencia" ADD COLUMN "url_producto" TEXT;
ALTER TABLE "prod_precios_competencia" ADD COLUMN "estado" TEXT NOT NULL DEFAULT 'PENDIENTE';
ALTER TABLE "prod_precios_competencia" ADD COLUMN "error_mensaje" TEXT;
ALTER TABLE "prod_precios_competencia" ADD COLUMN "relevado_at" TIMESTAMP(3);

UPDATE "prod_precios_competencia"
SET "estado" = 'SIN_URL'
WHERE "url_producto" IS NULL;
