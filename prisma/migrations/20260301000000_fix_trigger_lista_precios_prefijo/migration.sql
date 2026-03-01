-- Actualiza el trigger de lista_precios_proveedores para usar p.prefijo en lugar de p.sufijo
-- (la columna proveedores.sufijo fue renombrada a prefijo en 20260227000000_rename_sufijo_cod_externo)

CREATE OR REPLACE FUNCTION trg_lista_precios_set_cod_ext()
RETURNS TRIGGER AS $$
BEGIN
  SELECT p.prefijo || '-' || NEW.cod_prod_proveedor
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
