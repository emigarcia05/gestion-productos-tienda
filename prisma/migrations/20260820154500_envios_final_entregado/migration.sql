-- Conductor confirma la entrega; el envío sale del listado pendiente.
ALTER TABLE "envios_final" ADD COLUMN "entregado" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "envios_final_entregado_idx" ON "envios_final"("entregado");
