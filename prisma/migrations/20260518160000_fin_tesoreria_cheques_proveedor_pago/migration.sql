-- Cheque entregado a proveedor de mercadería: referencia opcional al catálogo.
ALTER TABLE "fin_tesoreria_cheques" ADD COLUMN "proveedor_id" TEXT;

ALTER TABLE "fin_tesoreria_cheques"
  ADD CONSTRAINT "fin_tesoreria_cheques_proveedor_id_fkey"
  FOREIGN KEY ("proveedor_id") REFERENCES "global_proveedores"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "fin_tesoreria_cheques_proveedor_id_idx" ON "fin_tesoreria_cheques"("proveedor_id");
