-- Cheques transferidos: conservar fila con fecha de transferencia (purge a 500 días en aplicación).
ALTER TABLE "fin_tesoreria_cheques" ADD COLUMN "fecha_transferencia" TIMESTAMP(3);
ALTER TABLE "fin_tesoreria_cheques" ADD COLUMN "caja_destino_id" TEXT;

CREATE INDEX "fin_tesoreria_cheques_caja_id_fecha_transferencia_idx"
    ON "fin_tesoreria_cheques"("caja_id", "fecha_transferencia");

ALTER TABLE "fin_tesoreria_cheques"
    ADD CONSTRAINT "fin_tesoreria_cheques_caja_destino_id_fkey"
    FOREIGN KEY ("caja_destino_id") REFERENCES "fin_tesoreria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
