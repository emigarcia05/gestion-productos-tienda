-- Discriminación de IVA por imputación (`fin_bal_gasto_final.iva` define SIEMPRE/NUNCA/PREGUNTA).
ALTER TABLE "fin_bal_gasto_mensual" ADD COLUMN "iva" BOOLEAN NOT NULL DEFAULT false;

UPDATE "fin_bal_gasto_mensual" AS m
SET "iva" = CASE
  WHEN f."iva" = 'SIEMPRE'::"IvaProveedor" THEN true
  WHEN f."iva" = 'NUNCA'::"IvaProveedor" THEN false
  ELSE false
END
FROM "fin_bal_gasto_final" AS f
WHERE f."id" = m."gasto_final_id";
