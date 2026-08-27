-- Letra del correlativo NOTA_CREDITO: c → X. Conserva los tramos numéricos.
UPDATE "prod_ped_ult_comp"
SET "ult_comprobante" = 'X-' || split_part(btrim("ult_comprobante"), '-', 2) || '-' || split_part(btrim("ult_comprobante"), '-', 3)
WHERE "id" = 3
  AND btrim("ult_comprobante") ~ '^[A-Za-z]-[0-9]+-[0-9]+$'
  AND split_part(btrim("ult_comprobante"), '-', 1) IS DISTINCT FROM 'X';
