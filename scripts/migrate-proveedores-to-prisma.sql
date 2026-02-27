-- Migración: alinear tabla proveedores con el schema de Prisma
-- Caso: tabla tiene id SERIAL, nombre, abreviatura, created_at (sin sufijo, codigo_unico, updated_at)
-- Resultado: id TEXT, nombre, sufijo, codigo_unico, created_at, updated_at

-- 0) Si la tabla no existe, crearla ya con la estructura correcta
CREATE TABLE IF NOT EXISTS proveedores (
  id            TEXT PRIMARY KEY,
  nombre        TEXT NOT NULL UNIQUE,
  sufijo        TEXT NOT NULL UNIQUE,
  codigo_unico  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sufijo_3_letras CHECK (length(sufijo) = 3 AND sufijo ~ '^[A-Za-z]{3}$')
);

-- 1) Renombrar abreviatura → sufijo (si existe abreviatura)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proveedores' AND column_name = 'abreviatura'
  ) THEN
    ALTER TABLE proveedores RENAME COLUMN abreviatura TO sufijo;
    -- Renombrar constraint si existe
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_abreviatura_3_letras') THEN
      ALTER TABLE proveedores RENAME CONSTRAINT chk_abreviatura_3_letras TO chk_sufijo_3_letras;
    END IF;
    DROP INDEX IF EXISTS idx_proveedores_abreviatura;
  END IF;
END $$;

-- 2) Añadir columnas que faltan
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS codigo_unico TEXT;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3) Rellenar (sufijo ya existe después del rename)
UPDATE proveedores SET codigo_unico = sufijo WHERE codigo_unico IS NULL;
UPDATE proveedores SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;

-- 4) Hacer NOT NULL
ALTER TABLE proveedores ALTER COLUMN codigo_unico SET NOT NULL;
ALTER TABLE proveedores ALTER COLUMN updated_at SET NOT NULL;

-- 5) Cambiar id de integer (SERIAL) a TEXT para Prisma
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proveedores' AND column_name = 'id' AND data_type = 'integer'
  ) THEN
    ALTER TABLE proveedores ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE proveedores ALTER COLUMN id TYPE TEXT USING id::TEXT;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 6) Asegurar constraint de sufijo 3 letras (por si no existía)
ALTER TABLE proveedores DROP CONSTRAINT IF EXISTS chk_sufijo_3_letras;
ALTER TABLE proveedores ADD CONSTRAINT chk_sufijo_3_letras CHECK (length(sufijo) = 3 AND sufijo ~ '^[A-Za-z]{3}$');

-- 7) Índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedores_sufijo ON proveedores (sufijo);
CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedores_codigo_unico ON proveedores (codigo_unico);
CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores (nombre);
CREATE INDEX IF NOT EXISTS idx_proveedores_created_at ON proveedores (created_at);

COMMENT ON TABLE proveedores IS 'Proveedores de la tienda (schema Prisma)';
COMMENT ON COLUMN proveedores.sufijo IS 'Exactamente 3 letras (A-Z, a-z)';
