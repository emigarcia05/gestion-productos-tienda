-- Registro opcional: proveedor de mercadería asociado al pago con el cheque (sin otras acciones contables).
ALTER TABLE "fin_tesoreria_cheques" ADD COLUMN "entrega_proveedor" TEXT;

ALTER TABLE "fin_tesoreria_cheques"
    ADD CONSTRAINT "fin_tesoreria_cheques_entrega_proveedor_fkey"
    FOREIGN KEY ("entrega_proveedor") REFERENCES "global_proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "fin_tesoreria_cheques_entrega_proveedor_idx" ON "fin_tesoreria_cheques"("entrega_proveedor");
