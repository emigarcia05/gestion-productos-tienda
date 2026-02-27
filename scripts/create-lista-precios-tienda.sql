-- Tabla lista_precios_tienda – Alimentada exclusivamente por API externa
-- Sin FK; índice en cod_externo para cruces rápidos con lista_precios_proveedores (cod_ext = cod_externo).
-- Upsert por cod_externo. last_sync se actualiza en cada escritura.
-- Solo la lógica de sincronización API debe escribir; frontend solo lectura.
-- Ejecutar: npm run db:create-lista-precios-tienda

-- Habilitar extensión UUID si no existe (para gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS lista_precios_tienda (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_tienda        TEXT NOT NULL,
  cod_externo       TEXT NOT NULL UNIQUE,
  rubro             TEXT,
  sub_rubro         TEXT,
  marca             TEXT,
  proveedor         TEXT,
  descripcion_tienda TEXT,
  costo_compra      NUMERIC(14,4) NOT NULL DEFAULT 0,
  px_lista_tienda   NUMERIC(14,4) NOT NULL DEFAULT 0,
  stock_maipu       INTEGER NOT NULL DEFAULT 0,
  stock_guaymallen  INTEGER NOT NULL DEFAULT 0,
  last_sync         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice en cod_externo para JOINs rápidos con lista_precios_proveedores.cod_ext
CREATE INDEX IF NOT EXISTS idx_lista_precios_tienda_cod_externo
  ON lista_precios_tienda (cod_externo);

-- Índice para búsquedas por proveedor (texto); cruce con proveedores.nombre por ILIKE/=
CREATE INDEX IF NOT EXISTS idx_lista_precios_tienda_proveedor
  ON lista_precios_tienda (proveedor);

COMMENT ON TABLE lista_precios_tienda IS 'Precios tienda desde API externa; solo sincronización API escribe. Frontend solo lectura.';
COMMENT ON COLUMN lista_precios_tienda.cod_externo IS 'Llave para relacionar con lista_precios_proveedores.cod_ext';
COMMENT ON COLUMN lista_precios_tienda.proveedor IS 'Texto libre; para cruce con proveedores usar: JOIN proveedores p ON p.nombre ILIKE t.proveedor OR p.nombre = t.proveedor';
COMMENT ON COLUMN lista_precios_tienda.descripcion_tienda IS 'Descripción provista por la API de tienda';
COMMENT ON COLUMN lista_precios_tienda.last_sync IS 'Última vez que la API actualizó este registro';

-- Trigger: actualizar last_sync en cada INSERT/UPDATE
CREATE OR REPLACE FUNCTION trg_lista_precios_tienda_last_sync()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_sync := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lista_precios_tienda_sync ON lista_precios_tienda;
CREATE TRIGGER trg_lista_precios_tienda_sync
  BEFORE INSERT OR UPDATE ON lista_precios_tienda
  FOR EACH ROW
  EXECUTE PROCEDURE trg_lista_precios_tienda_last_sync();
