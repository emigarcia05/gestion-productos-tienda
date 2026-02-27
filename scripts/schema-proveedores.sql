-- Tabla proveedores para Neon/PostgreSQL
-- Ejecutar en la consola SQL de Neon o con: psql $DATABASE_URL -f scripts/schema-proveedores.sql

DROP TABLE IF EXISTS proveedores;

CREATE TABLE proveedores (
  id           SERIAL PRIMARY KEY,
  nombre       TEXT NOT NULL,
  abreviatura  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_abreviatura_3_letras CHECK (
    length(abreviatura) = 3
    AND abreviatura ~ '^[A-Za-z]{3}$'
  )
);

-- Índices útiles para búsquedas
CREATE UNIQUE INDEX idx_proveedores_nombre ON proveedores (nombre);
CREATE UNIQUE INDEX idx_proveedores_abreviatura ON proveedores (abreviatura);
CREATE INDEX idx_proveedores_created_at ON proveedores (created_at);

COMMENT ON TABLE proveedores IS 'Proveedores de la tienda';
COMMENT ON COLUMN proveedores.abreviatura IS 'Exactamente 3 letras (A-Z, a-z)';
