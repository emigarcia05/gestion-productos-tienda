-- Sitio web del competidor: opcional (solo referencia; fichas en prod_precios_competencia).
ALTER TABLE "prod_competencia"
ALTER COLUMN "web" DROP NOT NULL;
