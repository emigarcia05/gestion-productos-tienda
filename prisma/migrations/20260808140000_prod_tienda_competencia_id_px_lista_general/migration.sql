-- Px Listas: competidor de referencia para PX de lista 1 - GENERAL (NULL = "-").
ALTER TABLE "prod_tienda"
ADD COLUMN IF NOT EXISTS "competencia_id_px_lista_general" TEXT;

ALTER TABLE "prod_tienda"
DROP CONSTRAINT IF EXISTS "prod_tienda_competencia_id_px_lista_general_fkey";

ALTER TABLE "prod_tienda"
ADD CONSTRAINT "prod_tienda_competencia_id_px_lista_general_fkey"
FOREIGN KEY ("competencia_id_px_lista_general") REFERENCES "prod_competencia" ("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "prod_tienda_competencia_id_px_lista_general_idx"
ON "prod_tienda" ("competencia_id_px_lista_general");
