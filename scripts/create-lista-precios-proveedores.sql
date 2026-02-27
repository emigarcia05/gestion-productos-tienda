-- Tabla lista_precios_proveedores – Integridad referencial con proveedores
-- cod_ext = sufijo del proveedor + '-' + cod_prod_proveedor (trigger)
-- px_compra_final = fórmula automática (columna generada)
-- Ejecutar: npm run db:create-lista-precios

-- Habilitar extensión UUID si no existe (para gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla principal
CREATE TABLE IF NOT EXISTS lista_precios_proveedores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_proveedor          TEXT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  cod_prod_proveedor    TEXT NOT NULL,
  descripcion_proveedor TEXT NOT NULL,
  cod_ext               TEXT NOT NULL,
  px_lista_proveedor    NUMERIC(14,4) NOT NULL DEFAULT 0,
  px_vta_sugerido       NUMERIC(14,4),
  dto_producto          INTEGER NOT NULL DEFAULT 0 CHECK (dto_producto >= 0 AND dto_producto <= 100),
  dto_cantidad          INTEGER NOT NULL DEFAULT 0 CHECK (dto_cantidad >= 0 AND dto_cantidad <= 100),
  cx_aprox_transporte   INTEGER NOT NULL DEFAULT 0 CHECK (cx_aprox_transporte >= 0 AND cx_aprox_transporte <= 100),
  px_compra_final       NUMERIC(14,4) GENERATED ALWAYS AS (
    px_lista_proveedor
    * (1 - COALESCE(dto_producto, 0)::numeric / 100)
    * (1 - COALESCE(dto_cantidad, 0)::numeric / 100)
    * (1 + COALESCE(cx_aprox_transporte, 0)::numeric / 100)
  ) STORED,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lista_precios_proveedor_cod UNIQUE (id_proveedor, cod_prod_proveedor),
  CONSTRAINT uq_lista_precios_cod_ext UNIQUE (cod_ext)
);

COMMENT ON TABLE lista_precios_proveedores IS 'Lista de precios por proveedor; px_compra_final se recalcula al actualizar porcentajes';
COMMENT ON COLUMN lista_precios_proveedores.descripcion_proveedor IS 'Descripción informada por el proveedor (importada desde su lista)';
COMMENT ON COLUMN lista_precios_proveedores.cod_ext IS 'sufijo del proveedor + ''-'' + cod_prod_proveedor (actualizado por trigger, único)';
COMMENT ON COLUMN lista_precios_proveedores.px_compra_final IS 'px_lista_proveedor * (1 - dto_producto/100) * (1 - dto_cantidad/100) * (1 + cx_aprox_transporte/100)';

-- Trigger: cod_ext = sufijo + '-' + cod_prod_proveedor; updated_at siempre al escribir
CREATE OR REPLACE FUNCTION trg_lista_precios_set_cod_ext()
RETURNS TRIGGER AS $$
BEGIN
  SELECT p.sufijo || '-' || NEW.cod_prod_proveedor
  INTO NEW.cod_ext
  FROM proveedores p
  WHERE p.id = NEW.id_proveedor;
  IF NEW.cod_ext IS NULL THEN
    RAISE EXCEPTION 'id_proveedor % no existe en proveedores', NEW.id_proveedor;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lista_precios_cod_ext ON lista_precios_proveedores;
CREATE TRIGGER trg_lista_precios_cod_ext
  BEFORE INSERT OR UPDATE
  ON lista_precios_proveedores
  FOR EACH ROW
  EXECUTE PROCEDURE trg_lista_precios_set_cod_ext();

-- Índices
CREATE INDEX IF NOT EXISTS idx_lista_precios_id_proveedor ON lista_precios_proveedores (id_proveedor);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lista_precios_cod_ext ON lista_precios_proveedores (cod_ext);
CREATE INDEX IF NOT EXISTS idx_lista_precios_updated_at ON lista_precios_proveedores (updated_at);
