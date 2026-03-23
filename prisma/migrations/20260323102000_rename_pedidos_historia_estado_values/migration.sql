-- Cambia el catálogo de estados en `pedidos_historia`:
--   RECIBIDO -> RECEPCIONADO
--   PEDIDO   -> SIN RECEPCION

UPDATE "pedidos_historia"
SET "estado" = 'RECEPCIONADO'
WHERE "estado" = 'RECIBIDO';

UPDATE "pedidos_historia"
SET "estado" = 'SIN RECEPCION'
WHERE "estado" = 'PEDIDO';

