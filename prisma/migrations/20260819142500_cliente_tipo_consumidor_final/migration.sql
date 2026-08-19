-- ClienteTipo: FINAL → CONSUMIDOR_FINAL.

ALTER TABLE "clientes" DROP CONSTRAINT IF EXISTS "clientes_pintor_asociado_tipo_chk";

ALTER TYPE "ClienteTipo" RENAME VALUE 'FINAL' TO 'CONSUMIDOR_FINAL';

ALTER TABLE "clientes"
ADD CONSTRAINT "clientes_pintor_asociado_tipo_chk"
CHECK (
  ("tipo" = 'PINTOR' AND "pintor_asociado" IS NULL)
  OR ("tipo" = 'CONSUMIDOR_FINAL' AND ("pintor_asociado" IS NULL OR "pintor_asociado" <> "id"))
);
