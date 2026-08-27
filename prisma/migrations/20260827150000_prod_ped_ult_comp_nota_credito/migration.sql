-- Correlativo de nota de crédito (asistente NC). Seed = último usado antes del primero.
-- Primer **Nota Generada** → c-00000-00000001.
INSERT INTO "prod_ped_ult_comp" ("id", "tipo_comprobante", "ult_comprobante")
VALUES (3, 'NOTA_CREDITO', 'c-00000-00000000')
ON CONFLICT ("id") DO NOTHING;
