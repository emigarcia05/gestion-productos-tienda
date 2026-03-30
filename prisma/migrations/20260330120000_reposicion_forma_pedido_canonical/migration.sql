-- Forma de pedido reposición: solo valores canónicos CANT_FIJA y CANT_MAXIMA.
-- 1) Normaliza etiquetas legadas (UI) y mayúsculas/minúsculas a esos dos literales.
-- 2) Trigger: calcula reposicion_cant_pedir solo para esas dos formas.

UPDATE "pedidos_mercaderia"
SET "reposicion_forma_pedido" = 'CANT_FIJA'
WHERE "tipo_de_pedido" = 'REPOSICION'
  AND UPPER(TRIM(COALESCE("reposicion_forma_pedido", ''))) IN ('CANT_FIJA', 'CANT. FIJA');

UPDATE "pedidos_mercaderia"
SET "reposicion_forma_pedido" = 'CANT_MAXIMA'
WHERE "tipo_de_pedido" = 'REPOSICION'
  AND UPPER(TRIM(COALESCE("reposicion_forma_pedido", ''))) IN ('CANT_MAXIMA', 'CANT. MAX.');

CREATE OR REPLACE FUNCTION sync_pedidos_mercaderia_cant_pedir()
RETURNS TRIGGER AS $$
DECLARE
  stock_sucursal INTEGER := 0;
  sucursal_codigo TEXT;
  forma_norm TEXT;
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

    IF forma_norm = 'CANT_FIJA' THEN
      NEW.reposicion_cant_pedir := COALESCE(NEW.reposicion_cant_conf, 0);
    ELSIF forma_norm = 'CANT_MAXIMA' THEN
      NEW.reposicion_cant_pedir := GREATEST(0, COALESCE(NEW.reposicion_cant_conf, 0) - stock_sucursal);
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
