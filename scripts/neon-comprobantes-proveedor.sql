-- =============================================================================
-- Neon SQL Editor — comprobantes_proveedor + índice único en proveedores
-- =============================================================================
-- Esquema alineado con API DUX `/compras` (sync por sucursal).
-- Ejecutar UNA vez en la base donde ya exista la tabla proveedores.
--
-- Requisitos previos:
--   1) No debe haber dos filas con el mismo id_proveedor_dux distinto de NULL.
--   2) Cada id_proveedor en comprobantes debe existir en proveedores.id_proveedor_dux.
--
-- Si ya tenías la versión anterior de esta tabla, usá la migración Prisma
-- 20260330200000_comprobantes_proveedor_dux_campos en lugar de este script.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "proveedores_id_proveedor_dux_key" ON "proveedores"("id_proveedor_dux");

CREATE TABLE IF NOT EXISTS "comprobantes_proveedor" (
    "id" TEXT NOT NULL,
    "id_sucursal_empresa" TEXT NOT NULL,
    "tipo_comp" TEXT NOT NULL,
    "comprobante" TEXT NOT NULL,
    "fecha_comp" DATE NOT NULL,
    "id_proveedor" TEXT NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "monto_aplicado" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comprobantes_proveedor_pkey" PRIMARY KEY ("id")
);

-- Si la tabla ya existía sin FK, fallará: ajustar manualmente o usar migración incremental.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comprobantes_proveedor_id_proveedor_fkey'
  ) THEN
    ALTER TABLE "comprobantes_proveedor" ADD CONSTRAINT "comprobantes_proveedor_id_proveedor_fkey"
    FOREIGN KEY ("id_proveedor") REFERENCES "proveedores"("id_proveedor_dux") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "comprobantes_proveedor_fecha_comp_idx" ON "comprobantes_proveedor"("fecha_comp");
CREATE INDEX IF NOT EXISTS "comprobantes_proveedor_id_proveedor_idx" ON "comprobantes_proveedor"("id_proveedor");

CREATE UNIQUE INDEX IF NOT EXISTS "comprobantes_proveedor_natural_ux"
ON "comprobantes_proveedor"("id_sucursal_empresa", "tipo_comp", "comprobante", "fecha_comp", "id_proveedor");
