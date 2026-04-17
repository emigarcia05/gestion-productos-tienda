-- Renombrar columna `tipo` → `tipo_gasto` en movimientos de finanzas (índice compuesto alineado).

DROP INDEX IF EXISTS "movimientos_finanzas_sucursal_id_tipo_idx";

ALTER TABLE "movimientos_finanzas" RENAME COLUMN "tipo" TO "tipo_gasto";

CREATE INDEX "movimientos_finanzas_sucursal_id_tipo_gasto_idx"
ON "movimientos_finanzas"("sucursal_id", "tipo_gasto");
