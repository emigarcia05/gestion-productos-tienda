-- Catálogo envíos: envios_personas → clientes; tipo CLIENTE_FINAL → FINAL; pintor_asociado.

ALTER TYPE "EnviosPersonaTipo" RENAME VALUE 'CLIENTE_FINAL' TO 'FINAL';
ALTER TYPE "EnviosPersonaTipo" RENAME TO "ClienteTipo";

ALTER TABLE "envios_personas" RENAME TO "clientes";
ALTER TABLE "clientes" RENAME CONSTRAINT "envios_personas_pkey" TO "clientes_pkey";
ALTER INDEX "envios_personas_tipo_idx" RENAME TO "clientes_tipo_idx";
ALTER INDEX "envios_personas_apellido_nombre_idx" RENAME TO "clientes_apellido_nombre_idx";

ALTER TABLE "clientes" ADD COLUMN "pintor_asociado" TEXT;

ALTER TABLE "clientes"
ADD CONSTRAINT "clientes_pintor_asociado_fkey"
FOREIGN KEY ("pintor_asociado") REFERENCES "clientes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "clientes_pintor_asociado_idx" ON "clientes"("pintor_asociado");

ALTER TABLE "clientes"
ADD CONSTRAINT "clientes_pintor_asociado_tipo_chk"
CHECK (
  ("tipo" = 'PINTOR' AND "pintor_asociado" IS NULL)
  OR ("tipo" = 'FINAL' AND ("pintor_asociado" IS NULL OR "pintor_asociado" <> "id"))
);
