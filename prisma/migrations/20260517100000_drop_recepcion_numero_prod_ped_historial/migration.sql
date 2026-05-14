-- Contador de recepciones por pedido (histórico correlativo Excel); ya no se usa en aplicación.
ALTER TABLE "prod_ped_historial" DROP COLUMN IF EXISTS "recepcion_numero";
