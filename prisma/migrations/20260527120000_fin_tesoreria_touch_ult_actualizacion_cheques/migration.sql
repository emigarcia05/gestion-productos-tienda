-- Permite actualizar `ult_actualizacion` sin cambiar `monto` (cajas CHEQUE tras movimiento de cheques).
CREATE OR REPLACE FUNCTION set_cajas_tesoreria_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  IF NEW.monto IS DISTINCT FROM OLD.monto THEN
    NEW.ult_actualizacion = CURRENT_TIMESTAMP;
  ELSIF NEW.ult_actualizacion IS DISTINCT FROM OLD.ult_actualizacion THEN
    NULL;
  ELSE
    NEW.ult_actualizacion = OLD.ult_actualizacion;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
