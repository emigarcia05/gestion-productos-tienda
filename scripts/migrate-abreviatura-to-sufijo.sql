-- Migración: renombrar columna abreviatura → sufijo en proveedores
-- Ejecutar en la consola SQL de Neon o: psql $DATABASE_URL -f scripts/migrate-abreviatura-to-sufijo.sql

-- Renombrar columna
ALTER TABLE proveedores RENAME COLUMN abreviatura TO sufijo;

-- Renombrar constraint de 3 letras
ALTER TABLE proveedores RENAME CONSTRAINT chk_abreviatura_3_letras TO chk_sufijo_3_letras;

-- Recrear índice único con el nuevo nombre
DROP INDEX IF EXISTS idx_proveedores_abreviatura;
CREATE UNIQUE INDEX idx_proveedores_sufijo ON proveedores (sufijo);

-- Actualizar comentario de la columna
COMMENT ON COLUMN proveedores.sufijo IS 'Exactamente 3 letras (A-Z, a-z)';
