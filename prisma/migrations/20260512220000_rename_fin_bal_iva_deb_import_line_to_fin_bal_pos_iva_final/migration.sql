-- Posición de IVA (CSV débito): nombre de tabla alineado a prefijo fin_bal_pos_*.
ALTER TABLE "fin_bal_iva_deb_import_line" RENAME TO "fin_bal_pos_iva_final";
ALTER INDEX "fin_bal_iva_deb_import_line_dedupe_key_key" RENAME TO "fin_bal_pos_iva_final_dedupe_key_key";
ALTER INDEX "fin_bal_iva_deb_import_line_fecha_emision_idx" RENAME TO "fin_bal_pos_iva_final_fecha_emision_idx";
ALTER TABLE "fin_bal_pos_iva_final" RENAME CONSTRAINT "fin_bal_iva_deb_import_line_pkey" TO "fin_bal_pos_iva_final_pkey";
