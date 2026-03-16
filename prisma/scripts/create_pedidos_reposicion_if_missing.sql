-- Ejecutar en Neon SQL Editor solo si la tabla pedidos_reposicion no existe.
-- Si ya existe, no hagas nada. Después marca la migración como aplicada:
--   npx prisma migrate resolve --applied "20260314000000_add_pedidos_reposicion"

-- Enum (omitir si ya existe)
DO $$ BEGIN
  CREATE TYPE "FormaPedirReposicion" AS ENUM ('CANT_MAXIMA', 'CANT_FIJA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tabla
CREATE TABLE IF NOT EXISTS "pedidos_reposicion" (
  "id" TEXT NOT NULL,
  "id_proveedor" TEXT NOT NULL,
  "sucursal" TEXT NOT NULL,
  "cod_ext" TEXT NOT NULL,
  "punto_reposicion" INTEGER NOT NULL,
  "forma_pedir" "FormaPedirReposicion" NOT NULL,
  "cant" INTEGER NOT NULL,
  "cant_pedir" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pedidos_reposicion_pkey" PRIMARY KEY ("id")
);

-- Índice único (omitir si ya existe)
CREATE UNIQUE INDEX IF NOT EXISTS "pedidos_reposicion_id_proveedor_sucursal_cod_ext_key"
  ON "pedidos_reposicion"("id_proveedor", "sucursal", "cod_ext");

-- FKs (solo si no existen)
DO $$ BEGIN
  ALTER TABLE "pedidos_reposicion"
    ADD CONSTRAINT "pedidos_reposicion_id_proveedor_fkey"
    FOREIGN KEY ("id_proveedor") REFERENCES "proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "pedidos_reposicion"
    ADD CONSTRAINT "pedidos_reposicion_sucursal_fkey"
    FOREIGN KEY ("sucursal") REFERENCES "sucursales"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
