-- Usuarios: sucursal por defecto + módulos permitidos (Administración · USUARIOS).

ALTER TABLE "global_personal"
  ADD COLUMN IF NOT EXISTS "sucursal_por_defecto" TEXT,
  ADD COLUMN IF NOT EXISTS "modulos_permitidos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'global_personal_sucursal_por_defecto_fkey'
  ) THEN
    ALTER TABLE "global_personal"
      ADD CONSTRAINT "global_personal_sucursal_por_defecto_fkey"
      FOREIGN KEY ("sucursal_por_defecto") REFERENCES "global_sucursales"("codigo")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'global_personal_sucursal_por_defecto_check'
  ) THEN
    ALTER TABLE "global_personal"
      ADD CONSTRAINT "global_personal_sucursal_por_defecto_check"
      CHECK (
        "sucursal_por_defecto" IS NULL
        OR "sucursal_por_defecto" IN ('guaymallen', 'maipu')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'global_personal_modulos_permitidos_check'
  ) THEN
    ALTER TABLE "global_personal"
      ADD CONSTRAINT "global_personal_modulos_permitidos_check"
      CHECK (
        "modulos_permitidos" <@ ARRAY['gestion-productos', 'finanzas', 'marketing']::TEXT[]
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "global_personal_sucursal_por_defecto_idx"
  ON "global_personal" ("sucursal_por_defecto");
