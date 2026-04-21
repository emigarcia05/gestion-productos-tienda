-- =============================================================================
-- Neon SQL Editor — fin_compras_comprobante + índice único en global_proveedores
-- =============================================================================
-- Esquema alineado con API DUX `/compras` (sync por sucursal).
-- Ejecutar UNA vez en la base donde ya exista la tabla global_proveedores.
--
-- Requisitos previos:
--   1) No debe haber dos filas con el mismo id_proveedor_dux distinto de NULL.
--   2) Cada id_proveedor en comprobantes debe existir en global_proveedores.id_proveedor_dux.
--
-- Si ya tenías la versión anterior de esta tabla, usá las migraciones Prisma
-- (20260330180000_add_comprobantes_proveedor + 20260330200000_comprobantes_proveedor_dux_campos
--  + 20260418290000_rename_7_tablas_prod_fin) en lugar de este script.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "global_proveedores_id_proveedor_dux_key" ON "global_proveedores"("id_proveedor_dux");

CREATE TABLE IF NOT EXISTS "fin_compras_comprobante" (
    "id" TEXT NOT NULL,
    "id_sucursal_empresa" TEXT NOT NULL,
    "tipo_comp" TEXT NOT NULL,
    "comprobante" TEXT NOT NULL,
    "fecha_comp" DATE NOT NULL,
    "id_proveedor" TEXT NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "monto_aplicado" DECIMAL(14,2) NOT NULL,
    "controlado" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_compras_comprobante_pkey" PRIMARY KEY ("id")
);

-- Si la tabla ya existía sin FK, fallará: ajustar manualmente o usar migración incremental.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fin_compras_comprobante_id_proveedor_fkey'
  ) THEN
    ALTER TABLE "fin_compras_comprobante" ADD CONSTRAINT "fin_compras_comprobante_id_proveedor_fkey"
    FOREIGN KEY ("id_proveedor") REFERENCES "global_proveedores"("id_proveedor_dux") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "fin_compras_comprobante_fecha_comp_idx" ON "fin_compras_comprobante"("fecha_comp");
CREATE INDEX IF NOT EXISTS "fin_compras_comprobante_id_proveedor_idx" ON "fin_compras_comprobante"("id_proveedor");

CREATE UNIQUE INDEX IF NOT EXISTS "fin_compras_comprobante_natural_ux"
ON "fin_compras_comprobante"("id_sucursal_empresa", "tipo_comp", "comprobante", "fecha_comp", "id_proveedor");
