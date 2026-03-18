-- Regla de reposicion_cant_pedir:
-- Si reposicion_forma_pedido = CANT_FIJA / "CANT. FIJA" -> reposicion_cant_pedir = reposicion_cant_conf
-- Si reposicion_forma_pedido = CANT_MAXIMA / "CANT. MAX." -> reposicion_cant_pedir = reposicion_cant_conf - stock(sucursal)
-- (stock_maipu o stock_guaymallen según sucursal.codigo)

-- 1) Normaliza datos existentes para filas de REPOSICION
UPDATE "pedidos_mercaderia" pm
SET "reposicion_cant_pedir" = CASE
  WHEN UPPER(COALESCE(pm."reposicion_forma_pedido", '')) IN ('CANT_FIJA', 'CANT. FIJA')
    THEN COALESCE(pm."reposicion_cant_conf", 0)
  WHEN UPPER(COALESCE(pm."reposicion_forma_pedido", '')) IN ('CANT_MAXIMA', 'CANT. MAX.')
    THEN GREATEST(0, COALESCE(pm."reposicion_cant_conf", 0) - COALESCE(stk.stock_sucursal, 0))
  ELSE COALESCE(pm."reposicion_cant_pedir", 0)
END
FROM (
  SELECT
    p.id,
    CASE
      WHEN s.codigo = 'maipu' THEN COALESCE(t.stock_maipu, 0)
      WHEN s.codigo = 'guaymallen' THEN COALESCE(t.stock_guaymallen, 0)
      ELSE 0
    END AS stock_sucursal
  FROM "pedidos_mercaderia" p
  LEFT JOIN "sucursales" s ON s.id = p.sucursal_id
  LEFT JOIN "precios_tienda" t ON t.cod_ext = p.cod_ext
) AS stk
WHERE pm.id = stk.id
  AND pm."tipo_de_pedido" = 'REPOSICION';

-- 2) Reemplaza la función de sincronización para incluir reposición + cant_pedir
CREATE OR REPLACE FUNCTION sync_pedidos_mercaderia_cant_pedir()
RETURNS TRIGGER AS $$
DECLARE
  stock_sucursal INTEGER := 0;
  sucursal_codigo TEXT;
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

    IF UPPER(COALESCE(NEW.reposicion_forma_pedido, '')) IN ('CANT_FIJA', 'CANT. FIJA') THEN
      NEW.reposicion_cant_pedir := COALESCE(NEW.reposicion_cant_conf, 0);
    ELSIF UPPER(COALESCE(NEW.reposicion_forma_pedido, '')) IN ('CANT_MAXIMA', 'CANT. MAX.') THEN
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
