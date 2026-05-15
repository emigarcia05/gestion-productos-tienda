-- Correlativos por tipo de comprobante (Excel recepción pedidos).
ALTER TABLE "prod_ped_ult_comp" ADD COLUMN IF NOT EXISTS "tipo_comprobante" TEXT;

INSERT INTO "prod_ped_ult_comp" ("id", "tipo_comprobante", "ult_comprobante")
VALUES (1, 'Comprobante_Compra', '1234569011')
ON CONFLICT ("id") DO UPDATE
SET "tipo_comprobante" = EXCLUDED."tipo_comprobante",
    "ult_comprobante" = EXCLUDED."ult_comprobante";

INSERT INTO "prod_ped_ult_comp" ("id", "tipo_comprobante", "ult_comprobante")
VALUES (2, 'FACTURA', 'A-00000-00000027')
ON CONFLICT ("id") DO UPDATE
SET "tipo_comprobante" = EXCLUDED."tipo_comprobante",
    "ult_comprobante" = EXCLUDED."ult_comprobante";

ALTER TABLE "prod_ped_ult_comp" ALTER COLUMN "tipo_comprobante" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "prod_ped_ult_comp_tipo_comprobante_key" ON "prod_ped_ult_comp" ("tipo_comprobante");
