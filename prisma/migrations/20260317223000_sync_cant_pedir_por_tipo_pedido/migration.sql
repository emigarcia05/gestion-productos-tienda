-- Regla de consistencia para pedidos_mercaderia:
-- cant_pedir debe reflejar el campo específico según tipo_de_pedido.
-- TINTOMETRICO -> tintometrio_cant_pedir
-- URGENTE      -> urgente_cant_pedir
-- REPOSICION   -> reposicion_cant_pedir

-- 1) Normaliza datos existentes
UPDATE "pedidos_mercaderia"
SET "cant_pedir" = COALESCE("tintometrio_cant_pedir", 0)
WHERE "tipo_de_pedido" = 'TINTOMETRICO';

UPDATE "pedidos_mercaderia"
SET "cant_pedir" = COALESCE("urgente_cant_pedir", 0)
WHERE "tipo_de_pedido" = 'URGENTE';

UPDATE "pedidos_mercaderia"
SET "cant_pedir" = COALESCE("reposicion_cant_pedir", 0)
WHERE "tipo_de_pedido" = 'REPOSICION';

-- 2) Función + trigger para futuras escrituras
CREATE OR REPLACE FUNCTION sync_pedidos_mercaderia_cant_pedir()
RETURNS TRIGGER AS $$
BEGIN
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

DROP TRIGGER IF EXISTS trg_sync_pedidos_mercaderia_cant_pedir ON "pedidos_mercaderia";

CREATE TRIGGER trg_sync_pedidos_mercaderia_cant_pedir
BEFORE INSERT OR UPDATE ON "pedidos_mercaderia"
FOR EACH ROW
EXECUTE FUNCTION sync_pedidos_mercaderia_cant_pedir();
