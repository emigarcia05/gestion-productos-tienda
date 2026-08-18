-- Direcciones de envío asociadas a una persona (cliente en el flujo de alta).
-- El módulo es nuevo: se vacían filas huérfanas para poder exigir persona_id.

DELETE FROM "envios_final";
DELETE FROM "envios_direcciones";

ALTER TABLE "envios_direcciones" ADD COLUMN "persona_id" TEXT NOT NULL;

CREATE INDEX "envios_direcciones_persona_id_idx" ON "envios_direcciones"("persona_id");

ALTER TABLE "envios_direcciones"
ADD CONSTRAINT "envios_direcciones_persona_id_fkey"
FOREIGN KEY ("persona_id") REFERENCES "envios_personas"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
