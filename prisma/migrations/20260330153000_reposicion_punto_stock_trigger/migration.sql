-- Reposición: el punto de pedido es la condición inicial del cálculo.
-- Regla:
--   si stock <= reposicion_punto_pedido:
--     CANT_FIJA   -> reposicion_cant_pedir = reposicion_cant_conf
--     CANT_MAXIMA -> reposicion_cant_pedir = max(0, reposicion_cant_conf - stock)
--   si stock > reposicion_punto_pedido:
--     reposicion_cant_pedir = 0
--
-- Además, cuando cambia stock en precios_tienda (sync DUX), se fuerza recálculo
-- de filas REPOSICION relacionadas por cod_ext.

CREATE OR REPLACE FUNCTION sync_pedidos_mercaderia_cant_pedir()
RETURNS TRIGGER AS $$
DECLARE
  stock_sucursal INTEGER := 0;
  sucursal_codigo TEXT;
  forma_norm TEXT;
  punto_norm INTEGER := 0;
  cant_conf_norm INTEGER := 0;
BEGIN
  IF NEW.tipo_de_pedido = 'REPOSICION' THEN
    SELECT s.codigo
      INTO sucursal_codigo
    FROM sucursales s
    WHERE s.id = NEW.sucursal_id
    LIMIT 1;

    IF sucursal_codigo = 'maipu' THEN
      SELECT COALESCE(t.stock_maipu, 0)
        INTO stock_sucursal
      FROM precios_tienda t
      WHERE t.cod_ext = NEW.cod_ext
      LIMIT 1;
    ELSIF sucursal_codigo = 'guaymallen' THEN
      SELECT COALESCE(t.stock_guaymallen, 0)
        INTO stock_sucursal
      FROM precios_tienda t
      WHERE t.cod_ext = NEW.cod_ext
      LIMIT 1;
    ELSE
      stock_sucursal := 0;
    END IF;

    forma_norm := UPPER(TRIM(COALESCE(NEW.reposicion_forma_pedido, '')));
    punto_norm := COALESCE(NEW.reposicion_punto_pedido, 0);
    cant_conf_norm := COALESCE(NEW.reposicion_cant_conf, 0);

    IF stock_sucursal <= punto_norm THEN
      IF forma_norm = 'CANT_FIJA' THEN
        NEW.reposicion_cant_pedir := cant_conf_norm;
      ELSIF forma_norm = 'CANT_MAXIMA' THEN
        NEW.reposicion_cant_pedir := GREATEST(0, cant_conf_norm - stock_sucursal);
      ELSE
        NEW.reposicion_cant_pedir := 0;
      END IF;
    ELSE
      NEW.reposicion_cant_pedir := 0;
    END IF;
  END IF;

  IF NEW.tipo_de_pedido = 'TINTOMETRICO' THEN
    NEW.cant_pedir := COALESCE(NEW.tintometrio_cant_pedir, 0);
  ELSIF NEW.tipo_de_pedido = 'URGENTE' THEN
    NEW.cant_pedir := COALESCE(NEW.urgente_cant_pedir, 0);
  ELSIF NEW.tipo_de_pedido = 'REPOSICION' THEN
    NEW.cant_pedir := COALESCE(NEW.reposicion_cant_pedir, 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_reposicion_on_precios_tienda_stock_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pedidos_mercaderia pm
  SET reposicion_cant_pedir = pm.reposicion_cant_pedir
  WHERE pm.tipo_de_pedido = 'REPOSICION'
    AND pm.cod_ext = NEW.cod_ext;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_reposicion_on_precios_tienda_stock ON precios_tienda;

CREATE TRIGGER trg_sync_reposicion_on_precios_tienda_stock
AFTER UPDATE OF stock_maipu, stock_guaymallen ON precios_tienda
FOR EACH ROW
EXECUTE FUNCTION sync_reposicion_on_precios_tienda_stock_change();

-- Recalcular filas existentes con la regla nueva.
UPDATE pedidos_mercaderia pm
SET reposicion_cant_pedir = pm.reposicion_cant_pedir
WHERE pm.tipo_de_pedido = 'REPOSICION';
