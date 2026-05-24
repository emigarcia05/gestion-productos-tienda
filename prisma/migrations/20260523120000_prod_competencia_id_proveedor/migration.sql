-- Competidor opcionalmente asociado a un proveedor cuyo px_vta_sugerido evita scraping.
ALTER TABLE "prod_competencia" ADD COLUMN "id_proveedor" TEXT;

CREATE INDEX "prod_competencia_id_proveedor_idx" ON "prod_competencia"("id_proveedor");

ALTER TABLE "prod_competencia" ADD CONSTRAINT "prod_competencia_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "global_proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
