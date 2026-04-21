-- Prefijo opcional: varios proveedores pueden omitirlo (NULL es distinto en UNIQUE).
ALTER TABLE "global_proveedores" ALTER COLUMN "prefijo" DROP NOT NULL;

-- Trigger de cod_ext: sin prefijo usar codigo_unico (evita NULL || '-' en PostgreSQL).
CREATE OR REPLACE FUNCTION trg_lista_precios_set_cod_ext()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(NULLIF(trim(p.prefijo), ''), p.codigo_unico) || '-' || NEW.cod_prod_proveedor
  INTO NEW.cod_ext
  FROM global_proveedores p
  WHERE p.id = NEW.id_proveedor;
  IF NEW.cod_ext IS NULL THEN
    RAISE EXCEPTION 'id_proveedor % no existe en global_proveedores', NEW.id_proveedor;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
