-- Backfill / corrección de `fin_bal_gasto_mensual.iva` para abril 2026 únicamente (`mes = 4`, `anio = 2026`).
-- Relación: `fin_bal_gasto_mensual.gasto_final_id` → `fin_bal_gasto_final.iva`.
--   * SIEMPRE  → iva = true
--   * NUNCA    → iva = false
--   * PREGUNTA → false (no hay en BD la decisión histórica del operador; revisar manualmente si aplica).

UPDATE "fin_bal_gasto_mensual" AS m
SET "iva" = CASE
  WHEN f."iva" = 'SIEMPRE'::"IvaProveedor" THEN true
  WHEN f."iva" = 'NUNCA'::"IvaProveedor" THEN false
  ELSE false
END
FROM "fin_bal_gasto_final" AS f
WHERE f."id" = m."gasto_final_id"
  AND m."mes" = 4
  AND m."anio" = 2026;
