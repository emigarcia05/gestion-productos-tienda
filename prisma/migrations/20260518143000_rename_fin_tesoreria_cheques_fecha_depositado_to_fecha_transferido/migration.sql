-- Renombra columna DATE (día AR de transferencia a cuenta DIGITAL); antes `fecha_depositado`.
ALTER TABLE "fin_tesoreria_cheques" RENAME COLUMN "fecha_depositado" TO "fecha_transferido";
