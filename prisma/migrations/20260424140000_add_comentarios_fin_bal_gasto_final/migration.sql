-- Texto libre opcional por fila de gasto final (catálogo balance).
-- IF NOT EXISTS: evita fallo si la columna ya se creó manualmente en Neon.
ALTER TABLE "fin_bal_gasto_final" ADD COLUMN IF NOT EXISTS "comentarios" TEXT;
