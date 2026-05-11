-- Nombre físico solicitado para líneas CSV IVA débito (histórico: fin_bal_iva_deb_import_line → fin_bal_pos_iva_final).
ALTER TABLE "fin_bal_pos_iva_final" RENAME TO "fin_bal_iva_deb_import";
ALTER INDEX "fin_bal_pos_iva_final_dedupe_key_key" RENAME TO "fin_bal_iva_deb_import_dedupe_key_key";
ALTER INDEX "fin_bal_pos_iva_final_fecha_emision_idx" RENAME TO "fin_bal_iva_deb_import_fecha_emision_idx";
ALTER TABLE "fin_bal_iva_deb_import" RENAME CONSTRAINT "fin_bal_pos_iva_final_pkey" TO "fin_bal_iva_deb_import_pkey";
